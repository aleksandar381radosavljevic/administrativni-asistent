import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";
import { z } from "zod";
import * as schemas from "./schemas";

// Checks the Zod schemas against docs/03-api-contract.yml (ADR 0013): the
// examples in 03 must parse, and every response schema must have exactly the
// properties of its 03 component, including all required ones.

interface OpenApiSchema {
  $ref?: string;
  allOf?: OpenApiSchema[];
  properties?: Record<string, OpenApiSchema>;
  required?: string[];
  enum?: string[];
  example?: unknown;
  default?: unknown;
}

const contract = parse(
  readFileSync(join(__dirname, "../../docs/03-api-contract.yml"), "utf8"),
);
const components: Record<string, OpenApiSchema> = contract.components.schemas;

function resolve(schema: OpenApiSchema): OpenApiSchema {
  return schema.$ref
    ? resolve(components[schema.$ref.split("/").pop()!])
    : schema;
}

/** Flattens allOf into one set of properties and required names. */
function shape(name: string): { properties: string[]; required: string[] } {
  const merge = (
    schema: OpenApiSchema,
  ): { properties: string[]; required: string[] } => {
    const resolved = resolve(schema);
    const parts = (resolved.allOf ?? []).map(merge);
    return {
      properties: [
        ...Object.keys(resolved.properties ?? {}),
        ...parts.flatMap((part) => part.properties),
      ],
      required: [
        ...(resolved.required ?? []),
        ...parts.flatMap((part) => part.required),
      ],
    };
  };
  return merge(components[name]);
}

function zodShape(schema: z.ZodType) {
  const json = z.toJSONSchema(schema, { io: "output" }) as {
    properties?: Record<string, unknown>;
    required?: string[];
  };
  return {
    properties: Object.keys(json.properties ?? {}),
    required: json.required ?? [],
  };
}

const responseSchemas: Record<string, z.ZodType> = {
  Pagination: schemas.paginationSchema,
  Error: schemas.errorSchema,
  ValidationError: schemas.validationErrorSchema,
  Category: schemas.categorySchema,
  CategoryListResponse: schemas.categoryListResponseSchema,
  InstitutionRef: schemas.institutionRefSchema,
  InstitutionSummary: schemas.institutionSummarySchema,
  Institution: schemas.institutionSchema,
  InstitutionDetail: schemas.institutionDetailSchema,
  InstitutionListResponse: schemas.institutionListResponseSchema,
  ProcedureRef: schemas.procedureRefSchema,
  ProcedureListResponse: schemas.procedureListResponseSchema,
  ProcedureSummary: schemas.procedureSummarySchema,
  ProcedureDetail: schemas.procedureDetailSchema,
  ProcedureInstitution: schemas.procedureInstitutionSchema,
  LifeEventLink: schemas.lifeEventLinkSchema,
  Step: schemas.stepSchema,
  Document: schemas.documentSchema,
  LifeEventSummary: schemas.lifeEventSummarySchema,
  LifeEventDetail: schemas.lifeEventDetailSchema,
  ProcedureInEvent: schemas.procedureInEventSchema,
  Dependency: schemas.dependencySchema,
  DependencyListResponse: schemas.dependencyListResponseSchema,
  Synonym: schemas.synonymSchema,
  SynonymListResponse: schemas.synonymListResponseSchema,
  AiQuery: schemas.aiQuerySchema,
  AiQueryListResponse: schemas.aiQueryListResponseSchema,
  AiQueryStatsResponse: schemas.aiQueryStatsResponseSchema,
  AuditLogEntry: schemas.auditLogEntrySchema,
  AuditLogListResponse: schemas.auditLogListResponseSchema,
  LifeEventListResponse: schemas.lifeEventListResponseSchema,
  SearchResponse: schemas.searchResponseSchema,
};

describe("response schemas match 03 components", () => {
  for (const [name, schema] of Object.entries(responseSchemas)) {
    it(name, () => {
      const expected = shape(name);
      const actual = zodShape(schema);
      expect(actual.properties.sort()).toEqual(
        [...new Set(expected.properties)].sort(),
      );
      for (const required of expected.required)
        expect(actual.required).toContain(required);
    });
  }
});

describe("enums match 03", () => {
  it.each([
    ["ContentStatus", schemas.contentStatusSchema],
    ["CostType", schemas.costTypeSchema],
    ["InstitutionKind", schemas.institutionKindSchema],
    ["AuditAction", schemas.auditActionSchema],
  ] as const)("%s", (name, schema) => {
    expect(schema.options).toEqual(components[name].enum);
  });

  it("money uses the 03 pattern", () => {
    expect(
      schemas.moneySchema.safeParse(components.Money.example).success,
    ).toBe(true);
    expect(schemas.moneySchema.safeParse("1250").success).toBe(false);
    expect(schemas.moneySchema.safeParse("1250.5").success).toBe(false);
  });
});

describe("03 examples parse", () => {
  it("GET /categories 200 example", () => {
    const example =
      contract.paths["/categories"].get.responses["200"].content[
        "application/json"
      ].example;
    expect(schemas.categoryListResponseSchema.parse(example)).toEqual(example);
  });

  it.each([
    "BadRequest",
    "Unauthorized",
    "Forbidden",
    "NotFound",
    "Conflict",
    "InternalError",
  ])("%s error example", (name) => {
    const example =
      contract.components.responses[name].content["application/json"].example;
    expect(schemas.errorSchema.parse(example)).toEqual(example);
  });

  it("GET /admin/ai-queries/stats 200 example", () => {
    const example =
      contract.paths["/admin/ai-queries/stats"].get.responses["200"].content[
        "application/json"
      ].example;
    expect(schemas.aiQueryStatsResponseSchema.parse(example)).toEqual(example);
  });

  it("ValidationError example", () => {
    const example =
      contract.components.responses.ValidationError.content["application/json"]
        .example;
    expect(schemas.validationErrorSchema.parse(example)).toEqual(example);
  });

  it("search q example with the default limit", () => {
    const q = contract.paths["/search"].get.parameters.find(
      (p: { name?: string }) => p.name === "q",
    ).example;
    const limitDefault = contract.components.parameters.Limit.schema.default;
    expect(schemas.searchQuerySchema.parse({ q })).toEqual({
      q,
      limit: limitDefault,
    });
  });

  it("life event list query with the category example and pagination defaults", () => {
    const categorySlug = contract.paths["/life-events"].get.parameters.find(
      (p: { name?: string }) => p.name === "category_slug",
    ).example;
    expect(
      schemas.lifeEventListQuerySchema.parse({ category_slug: categorySlug }),
    ).toEqual({
      category_slug: categorySlug,
      limit: contract.components.parameters.Limit.schema.default,
      offset: contract.components.parameters.Offset.schema.default,
    });
  });

  it("slug path example", () => {
    expect(
      schemas.slugSchema.parse(contract.components.parameters.SlugPath.example),
    ).toBe("selim-se");
  });
});

describe("request limits from 03", () => {
  it("rejects a search shorter than 2 characters or longer than 200", () => {
    expect(schemas.searchQuerySchema.safeParse({ q: "a" }).success).toBe(false);
    expect(
      schemas.searchQuerySchema.safeParse({ q: "a".repeat(201) }).success,
    ).toBe(false);
  });

  it("keeps limit within 1..100 and offset at 0 or more", () => {
    const parse = (query: Record<string, string>) =>
      schemas.paginationQuerySchema.safeParse(query).success;
    expect(parse({ limit: "100", offset: "0" })).toBe(true);
    expect(parse({ limit: "0" })).toBe(false);
    expect(parse({ limit: "101" })).toBe(false);
    expect(parse({ offset: "-1" })).toBe(false);
    expect(parse({ limit: "abc" })).toBe(false);
  });
});
