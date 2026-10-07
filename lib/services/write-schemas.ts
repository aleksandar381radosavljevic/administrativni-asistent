import { z } from "zod";
import { labels } from "@/lib/i18n/labels";
import {
  contentStatusSchema,
  costTypeSchema,
  institutionKindSchema,
  moneySchema,
  paginationQuerySchema,
  slugSchema,
  timestampSchema,
} from "./schemas";

// Request bodies and filters of the admin endpoints, mirroring the *Write,
// *Patch and parameter components in docs/03-api-contract.yml (ADR 0013).
// Body fields that 03 marks optional default to null (or the 03 default), so
// a PUT replaces the whole record and the database never sees `undefined`.

const messages = labels.validation;

/** Ids in bodies are lowercased so they compare equal to Postgres output. */
const requestIdSchema = z.guid().transform((id) => id.toLowerCase());

const text = (max?: number) => {
  const base = z.string().trim().min(1);
  return max === undefined ? base : base.max(max);
};
const optionalText = (max?: number) =>
  (max === undefined ? z.string() : z.string().max(max))
    .nullable()
    .default(null);
// Links are rendered on public pages, so only http(s) is accepted: a
// `javascript:` URL would run in the citizen's browser.
const link = z
  .url({ protocol: /^https?$/ })
  .max(500)
  .nullable()
  .default(null);
const sortOrder = z.int();

/** Adds an issue for every repeated value of `key` in a list field. */
function uniqueBy<T>(
  items: readonly T[],
  key: (item: T) => unknown,
  ctx: z.RefinementCtx,
  path: (string | number)[],
  message: string,
) {
  const seen = new Set<unknown>();
  items.forEach((item, index) => {
    const value = key(item);
    if (seen.has(value)) {
      ctx.addIssue({ code: "custom", message, path: [...path, index] });
    }
    seen.add(value);
  });
}

// ---- Categories ---------------------------------------------------------------

export const categoryWriteSchema = z.object({
  name: text(100),
  slug: slugSchema.max(100),
  icon: optionalText(100),
  sort_order: sortOrder.default(0),
});

// ---- Life events --------------------------------------------------------------

export const lifeEventWriteSchema = z.object({
  title: text(200),
  description: optionalText(),
  slug: slugSchema,
  category_id: requestIdSchema,
  icon: optionalText(100),
  estimated_duration: optionalText(100),
  status: contentStatusSchema,
  sort_order: sortOrder.default(0),
});

/** Create accepts drafts only: a new event has no procedures yet (PR-04, 03). */
export const lifeEventCreateSchema = lifeEventWriteSchema.refine(
  (event) => event.status === "draft",
  { message: messages.newLifeEventDraft, path: ["status"] },
);

export const lifeEventProceduresWriteSchema = z.object({
  procedures: z
    .array(
      z.object({
        procedure_id: requestIdSchema,
        sort_order: z.int().min(0),
      }),
    )
    .superRefine((items, ctx) => {
      uniqueBy(
        items,
        (item) => item.procedure_id,
        ctx,
        [],
        messages.duplicateItem,
      );
      uniqueBy(
        items,
        (item) => item.sort_order,
        ctx,
        [],
        messages.duplicateSortOrder,
      );
    }),
});

export const statusChangeSchema = z.object({ status: contentStatusSchema });

// ---- Procedures ---------------------------------------------------------------

const stepWriteSchema = z.object({
  title: text(300),
  description: z.string(),
  sort_order: sortOrder,
  link_url: link,
  link_label: optionalText(200),
});

const documentWriteSchema = z.object({
  name: text(300),
  description: optionalText(),
  is_required: z.boolean(),
  note: optionalText(),
  sort_order: sortOrder,
});

export const procedureWriteSchema = z
  .object({
    title: text(200),
    description: optionalText(),
    slug: slugSchema,
    can_online: z.boolean().default(false),
    can_in_person: z.boolean().default(true),
    can_by_mail: z.boolean().default(false),
    cost_type: costTypeSchema,
    cost_amount: moneySchema.nullable().default(null),
    cost_description: optionalText(),
    processing_time: optionalText(200),
    official_link: link,
    form_link: link,
    status: contentStatusSchema,
    last_verified_at: timestampSchema.nullable().default(null),
    steps: z.array(stepWriteSchema).min(1, messages.stepsRequired),
    documents: z.array(documentWriteSchema).default([]),
    institution_ids: z
      .array(requestIdSchema)
      .min(1, messages.institutionsRequired),
    institution_notes: z
      .record(z.string(), z.string().max(1000))
      .default({})
      .transform((notes) =>
        Object.fromEntries(
          Object.entries(notes).map(([id, note]) => [id.toLowerCase(), note]),
        ),
      ),
  })
  .superRefine((procedure, ctx) => {
    if (
      !procedure.can_online &&
      !procedure.can_in_person &&
      !procedure.can_by_mail
    ) {
      ctx.addIssue({
        code: "custom",
        message: messages.methodRequired,
        path: ["can_in_person"],
      });
    }
    if (procedure.cost_type === "fixed" && procedure.cost_amount === null) {
      ctx.addIssue({
        code: "custom",
        message: messages.costAmountRequired,
        path: ["cost_amount"],
      });
    }
    if (procedure.cost_type !== "fixed" && procedure.cost_amount !== null) {
      ctx.addIssue({
        code: "custom",
        message: messages.costAmountForbidden,
        path: ["cost_amount"],
      });
    }
    uniqueBy(
      procedure.steps,
      (step) => step.sort_order,
      ctx,
      ["steps"],
      messages.duplicateSortOrder,
    );
    uniqueBy(
      procedure.documents,
      (document) => document.sort_order,
      ctx,
      ["documents"],
      messages.duplicateSortOrder,
    );
    uniqueBy(
      procedure.institution_ids,
      (id) => id,
      ctx,
      ["institution_ids"],
      messages.duplicateItem,
    );
    const linked = new Set(procedure.institution_ids);
    for (const id of Object.keys(procedure.institution_notes)) {
      if (!linked.has(id)) {
        ctx.addIssue({
          code: "custom",
          message: messages.noteWithoutInstitution,
          path: ["institution_notes", id],
        });
      }
    }
  });

export const procedurePatchSchema = z
  .object({
    status: contentStatusSchema.optional(),
    last_verified_at: timestampSchema.optional(),
  })
  .refine(
    (patch) =>
      patch.status !== undefined || patch.last_verified_at !== undefined,
    { message: messages.atLeastOneField },
  );

// ---- Institutions -------------------------------------------------------------

export const institutionWriteSchema = z.object({
  name: text(200),
  slug: slugSchema,
  kind: institutionKindSchema,
  description: optionalText(),
  address: optionalText(),
  website: link,
  phone: optionalText(50),
  email: z.email().max(200).nullable().default(null),
  working_hours: optionalText(),
  status: contentStatusSchema,
});

// ---- Synonyms and dependencies ------------------------------------------------

export const synonymWriteSchema = z.object({
  term: z.string().trim().min(2).max(200),
  maps_to: z.string().trim().min(2).max(200),
});

export const dependencyWriteSchema = z
  .object({
    procedure_id: requestIdSchema,
    depends_on_id: requestIdSchema,
  })
  .refine(
    (dependency) => dependency.procedure_id !== dependency.depends_on_id,
    {
      message: messages.selfDependency,
      path: ["depends_on_id"],
    },
  );

// ---- Admin list filters (query strings, invalid = 400) ------------------------

const queryId = z.guid().transform((id) => id.toLowerCase());
// z.coerce.boolean() would read "false" as true; only the literals count.
const queryBoolean = z.enum(["true", "false"]).transform((v) => v === "true");
const period = {
  from: timestampSchema.optional(),
  to: timestampSchema.optional(),
};

export const adminListQuerySchema = paginationQuerySchema.extend({
  status: contentStatusSchema.optional(),
});

export const synonymListQuerySchema = paginationQuerySchema.extend({
  q: z.string().trim().min(1).max(200).optional(),
});

export const aiQueryListQuerySchema = paginationQuerySchema.extend({
  was_answered: queryBoolean.optional(),
  ...period,
});

export const aiQueryStatsQuerySchema = z.object(period);

export const auditLogQuerySchema = paginationQuerySchema.extend({
  entity_type: z.string().min(1).max(100).optional(),
  entity_id: queryId.optional(),
  changed_by: queryId.optional(),
  ...period,
});

export type CategoryWrite = z.infer<typeof categoryWriteSchema>;
export type LifeEventWrite = z.infer<typeof lifeEventWriteSchema>;
export type LifeEventProceduresWrite = z.infer<
  typeof lifeEventProceduresWriteSchema
>;
export type StatusChange = z.infer<typeof statusChangeSchema>;
export type ProcedureWrite = z.infer<typeof procedureWriteSchema>;
export type ProcedurePatch = z.infer<typeof procedurePatchSchema>;
export type InstitutionWrite = z.infer<typeof institutionWriteSchema>;
export type SynonymWrite = z.infer<typeof synonymWriteSchema>;
export type DependencyWrite = z.infer<typeof dependencyWriteSchema>;
export type AdminListQuery = z.infer<typeof adminListQuerySchema>;
export type SynonymListQuery = z.infer<typeof synonymListQuerySchema>;
export type AiQueryListQuery = z.infer<typeof aiQueryListQuerySchema>;
export type AiQueryStatsQuery = z.infer<typeof aiQueryStatsQuerySchema>;
export type AuditLogQuery = z.infer<typeof auditLogQuerySchema>;
