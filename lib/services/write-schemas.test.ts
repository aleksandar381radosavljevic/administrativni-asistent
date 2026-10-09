import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";
import { procedureWriteSchema, synonymWriteSchema } from "./write-schemas";

const contract = parse(
  readFileSync(join(__dirname, "../../docs/03-api-contract.yml"), "utf8"),
);

describe("admin request schemas", () => {
  it("accept the SynonymWrite example from 03", () => {
    const example =
      contract.paths["/admin/synonyms"].post.requestBody.content[
        "application/json"
      ].example;
    expect(synonymWriteSchema.parse(example)).toEqual(example);
  });

  it("lowercase institution ids and note keys so they match Postgres", () => {
    const id = "20000000-0000-4000-8000-00000000000A";
    const parsed = procedureWriteSchema.parse({
      title: "Pasoš",
      slug: "pasos",
      cost_type: "free",
      status: "draft",
      steps: [{ title: "Zakaži", description: "", sort_order: 1 }],
      institution_ids: [id],
      institution_notes: { [id]: "Napomena" },
    });
    expect(parsed.institution_ids).toEqual([id.toLowerCase()]);
    expect(parsed.institution_notes).toEqual({
      [id.toLowerCase()]: "Napomena",
    });
  });
});
