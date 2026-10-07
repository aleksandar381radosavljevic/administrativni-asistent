import { z } from "zod";

// Request and response schemas for the public read endpoints, mirroring the
// components in docs/03-api-contract.yml (ADR 0013). Response types are
// inferred from these schemas; schemas.test.ts checks them against 03.
// Responses always carry every property, with null for missing values.

// ---- Shared -------------------------------------------------------------------

// z.guid() instead of z.uuid(): Postgres accepts any 8-4-4-4-12 hex value, and
// test fixtures use non-RFC ids.
export const idSchema = z.guid();
export const slugSchema = z
  .string()
  .max(200)
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/);
export const contentStatusSchema = z.enum(["draft", "published", "archived"]);
export const costTypeSchema = z.enum(["free", "fixed", "variable", "unknown"]);
export const institutionKindSchema = z.enum([
  "government",
  "bank",
  "employer",
  "other",
]);
/** Money is a decimal string in RSD with two decimals, never a number (04 §4.1). */
export const moneySchema = z.string().regex(/^\d{1,8}\.\d{2}$/);
const timestampSchema = z.iso.datetime({ offset: true });

export const paginationSchema = z.object({
  total: z.int().min(0),
  limit: z.int(),
  offset: z.int(),
});

export const errorSchema = z.object({
  error: z.string(),
  message: z.string(),
});

export const validationErrorSchema = errorSchema.extend({
  details: z.array(z.object({ field: z.string(), message: z.string() })),
});

// ---- Requests -----------------------------------------------------------------

const limitSchema = z.coerce.number().int().min(1).max(100).default(20);
const offsetSchema = z.coerce.number().int().min(0).default(0);

export const paginationQuerySchema = z.object({
  limit: limitSchema,
  offset: offsetSchema,
});

export const lifeEventListQuerySchema = paginationQuerySchema.extend({
  category_slug: z.string().min(1).max(200).optional(),
});

export const searchQuerySchema = z.object({
  q: z.string().trim().min(2).max(200),
  limit: limitSchema,
});

export type LifeEventListQuery = z.infer<typeof lifeEventListQuerySchema>;
export type SearchQuery = z.infer<typeof searchQuerySchema>;

// ---- Categories ---------------------------------------------------------------

export const categorySchema = z.object({
  id: idSchema,
  name: z.string(),
  slug: z.string(),
  icon: z.string().nullable(),
  sort_order: z.int(),
});

export const categoryListResponseSchema = z.object({
  data: z.array(categorySchema),
});

// ---- Institutions -------------------------------------------------------------

export const institutionRefSchema = z.object({
  name: z.string(),
  slug: z.string(),
  kind: institutionKindSchema,
});

export const institutionSummarySchema = z.object({
  id: idSchema,
  name: z.string(),
  slug: z.string(),
  kind: institutionKindSchema,
  address: z.string().nullable(),
  website: z.string().nullable(),
  phone: z.string().nullable(),
  email: z.string().nullable(),
  working_hours: z.string().nullable(),
  status: contentStatusSchema,
});

// ---- Procedures ---------------------------------------------------------------

export const procedureSummarySchema = z.object({
  id: idSchema,
  title: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  can_online: z.boolean(),
  can_in_person: z.boolean(),
  can_by_mail: z.boolean(),
  cost_type: costTypeSchema,
  cost_amount: moneySchema.nullable(),
  processing_time: z.string().nullable(),
  status: contentStatusSchema,
  is_stale: z.boolean(),
  last_verified_at: timestampSchema.nullable(),
});

export const stepSchema = z.object({
  id: idSchema,
  sort_order: z.int(),
  title: z.string(),
  description: z.string(),
  link_url: z.string().nullable(),
  link_label: z.string().nullable(),
});

export const documentSchema = z.object({
  id: idSchema,
  name: z.string(),
  description: z.string().nullable(),
  is_required: z.boolean(),
  note: z.string().nullable(),
  sort_order: z.int(),
});

export const procedureInstitutionSchema = institutionSummarySchema.extend({
  note: z.string().nullable(),
});

export const lifeEventLinkSchema = z.object({
  slug: z.string(),
  title: z.string(),
});

export const procedureDetailSchema = procedureSummarySchema.extend({
  cost_description: z.string().nullable(),
  official_link: z.string().nullable(),
  form_link: z.string().nullable(),
  steps: z.array(stepSchema),
  documents: z.array(documentSchema),
  institutions: z.array(procedureInstitutionSchema),
  life_events: z.array(lifeEventLinkSchema),
});

// ---- Life events --------------------------------------------------------------

export const lifeEventSummarySchema = z.object({
  id: idSchema,
  title: z.string(),
  description: z.string().nullable(),
  slug: z.string(),
  icon: z.string().nullable(),
  estimated_duration: z.string().nullable(),
  category: categorySchema,
  procedure_count: z.int().min(0),
  sort_order: z.int(),
  status: contentStatusSchema,
});

export const procedureInEventSchema = z.object({
  procedure_id: idSchema,
  title: z.string(),
  slug: z.string(),
  sort_order: z.int(),
  can_online: z.boolean(),
  can_in_person: z.boolean(),
  can_by_mail: z.boolean(),
  cost_type: costTypeSchema,
  cost_amount: moneySchema.nullable(),
  processing_time: z.string().nullable(),
  status: contentStatusSchema,
  is_stale: z.boolean(),
  institutions: z.array(institutionRefSchema),
  depends_on: z.array(idSchema),
});

export const dependencySchema = z.object({
  life_event_id: idSchema,
  procedure_id: idSchema,
  depends_on_id: idSchema,
});

export const lifeEventDetailSchema = lifeEventSummarySchema.extend({
  procedures: z.array(procedureInEventSchema),
  dependencies: z.array(dependencySchema),
});

export const lifeEventListResponseSchema = z.object({
  data: z.array(lifeEventSummarySchema),
  pagination: paginationSchema,
});

// ---- Search -------------------------------------------------------------------

export const searchResponseSchema = z.object({
  query: z.string(),
  original_query: z.string(),
  life_events: z.array(lifeEventSummarySchema),
  procedures: z.array(procedureSummarySchema),
  institutions: z.array(institutionSummarySchema),
  total_count: z.int().min(0),
});

export type Category = z.infer<typeof categorySchema>;
export type CategoryListResponse = z.infer<typeof categoryListResponseSchema>;
export type InstitutionRef = z.infer<typeof institutionRefSchema>;
export type InstitutionSummary = z.infer<typeof institutionSummarySchema>;
export type ProcedureSummary = z.infer<typeof procedureSummarySchema>;
export type ProcedureDetail = z.infer<typeof procedureDetailSchema>;
export type ProcedureInEvent = z.infer<typeof procedureInEventSchema>;
export type Dependency = z.infer<typeof dependencySchema>;
export type LifeEventSummary = z.infer<typeof lifeEventSummarySchema>;
export type LifeEventDetail = z.infer<typeof lifeEventDetailSchema>;
export type LifeEventListResponse = z.infer<typeof lifeEventListResponseSchema>;
export type SearchResponse = z.infer<typeof searchResponseSchema>;
