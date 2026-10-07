// Select lists and row-to-contract mapping for the public read services.
// Pure functions, so they are unit-tested without a database.

import { isStale } from "@/lib/domain/is-stale";
import type { Database } from "@/types/database";
import type {
  Category,
  Dependency,
  InstitutionRef,
  InstitutionSummary,
  LifeEventDetail,
  LifeEventSummary,
  ProcedureDetail,
  ProcedureInEvent,
  ProcedureSummary,
} from "./schemas";

type Enums = Database["public"]["Enums"];

// `cost_amount::text`: PostgREST would otherwise send numeric as a JSON
// number and JavaScript would parse it as a float. The cast keeps "1500.00".
export const CATEGORY_SELECT = "id, name, slug, icon, sort_order";

export const INSTITUTION_SUMMARY_SELECT =
  "id, name, slug, kind, address, website, phone, email, working_hours, status";

export const PROCEDURE_SUMMARY_SELECT =
  "id, title, slug, description, can_online, can_in_person, can_by_mail, cost_type, cost_amount::text, processing_time, status, last_verified_at";

// `!inner` on the link rows: an event whose procedures are all hidden is
// itself hidden (open question 1). RLS already hides non-public procedures.
export const LIFE_EVENT_SUMMARY_SELECT = `id, title, description, slug, icon, estimated_duration, sort_order, status,
  category:categories!inner(${CATEGORY_SELECT}),
  life_event_procedures!inner(procedure_id)`;

export const LIFE_EVENT_DETAIL_SELECT = `id, title, description, slug, icon, estimated_duration, sort_order, status,
  category:categories!inner(${CATEGORY_SELECT}),
  life_event_procedures!inner(sort_order,
    procedure:procedures!inner(id, title, slug, can_online, can_in_person, can_by_mail, cost_type, cost_amount::text, processing_time, status, last_verified_at,
      procedure_institutions(institution:institutions!inner(name, slug, kind))))`;

export const PROCEDURE_DETAIL_SELECT = `${PROCEDURE_SUMMARY_SELECT}, cost_description, official_link, form_link,
  steps(id, sort_order, title, description, link_url, link_label),
  documents(id, name, description, is_required, note, sort_order),
  procedure_institutions(note, institution:institutions!inner(${INSTITUTION_SUMMARY_SELECT})),
  life_event_procedures(life_event:life_events!inner(slug, title, sort_order))`;

// ---- Row shapes returned by the selects above ---------------------------------

export interface ProcedureSummaryRow {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  can_online: boolean;
  can_in_person: boolean;
  can_by_mail: boolean;
  cost_type: Enums["cost_type"];
  cost_amount: string | null;
  processing_time: string | null;
  status: Enums["content_status"];
  last_verified_at: string | null;
}

export interface LifeEventSummaryRow {
  id: string;
  title: string;
  description: string | null;
  slug: string;
  icon: string | null;
  estimated_duration: string | null;
  sort_order: number;
  status: Enums["content_status"];
  category: Category;
  life_event_procedures: { procedure_id: string }[];
}

export interface LifeEventDetailRow extends Omit<
  LifeEventSummaryRow,
  "life_event_procedures"
> {
  life_event_procedures: {
    sort_order: number;
    procedure: Omit<ProcedureSummaryRow, "description"> & {
      procedure_institutions: { institution: InstitutionRef }[];
    };
  }[];
}

export interface ProcedureDetailRow extends ProcedureSummaryRow {
  cost_description: string | null;
  official_link: string | null;
  form_link: string | null;
  steps: ProcedureDetail["steps"];
  documents: ProcedureDetail["documents"];
  procedure_institutions: {
    note: string | null;
    institution: InstitutionSummary;
  }[];
  life_event_procedures: {
    life_event: { slug: string; title: string; sort_order: number };
  }[];
}

const bySortOrder = <T extends { sort_order: number }>(items: readonly T[]) =>
  [...items].sort((a, b) => a.sort_order - b.sort_order);

// ---- Mappers ------------------------------------------------------------------

export function toProcedureSummary(
  row: ProcedureSummaryRow,
  now: Date,
): ProcedureSummary {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    description: row.description,
    can_online: row.can_online,
    can_in_person: row.can_in_person,
    can_by_mail: row.can_by_mail,
    cost_type: row.cost_type,
    cost_amount: row.cost_amount,
    processing_time: row.processing_time,
    status: row.status,
    is_stale: isStale(row.last_verified_at, now),
    last_verified_at: row.last_verified_at,
  };
}

export function toLifeEventSummary(row: LifeEventSummaryRow): LifeEventSummary {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    slug: row.slug,
    icon: row.icon,
    estimated_duration: row.estimated_duration,
    category: row.category,
    procedure_count: row.life_event_procedures.length,
    sort_order: row.sort_order,
    status: row.status,
  };
}

/**
 * Builds the life event detail. Dependencies come from a separate query; any
 * that point at a procedure not in this event's public list are dropped, so
 * nothing is blocked by a procedure the citizen cannot see (03 conventions).
 */
export function toLifeEventDetail(
  row: LifeEventDetailRow,
  dependencies: readonly Dependency[],
  now: Date,
): LifeEventDetail {
  const links = bySortOrder(row.life_event_procedures);
  const visible = new Set(links.map((link) => link.procedure.id));
  const publicDependencies = dependencies.filter(
    (d) =>
      d.life_event_id === row.id &&
      visible.has(d.procedure_id) &&
      visible.has(d.depends_on_id),
  );

  const procedures: ProcedureInEvent[] = links.map(
    ({ sort_order, procedure }) => ({
      procedure_id: procedure.id,
      title: procedure.title,
      slug: procedure.slug,
      sort_order,
      can_online: procedure.can_online,
      can_in_person: procedure.can_in_person,
      can_by_mail: procedure.can_by_mail,
      cost_type: procedure.cost_type,
      cost_amount: procedure.cost_amount,
      processing_time: procedure.processing_time,
      status: procedure.status,
      is_stale: isStale(procedure.last_verified_at, now),
      institutions: procedure.procedure_institutions.map(({ institution }) => ({
        name: institution.name,
        slug: institution.slug,
        kind: institution.kind,
      })),
      depends_on: publicDependencies
        .filter((d) => d.procedure_id === procedure.id)
        .map((d) => d.depends_on_id),
    }),
  );

  return {
    ...toLifeEventSummary({
      ...row,
      life_event_procedures: links.map((link) => ({
        procedure_id: link.procedure.id,
      })),
    }),
    procedures,
    dependencies: publicDependencies.map((d) => ({
      life_event_id: d.life_event_id,
      procedure_id: d.procedure_id,
      depends_on_id: d.depends_on_id,
    })),
  };
}

export function toProcedureDetail(
  row: ProcedureDetailRow,
  now: Date,
): ProcedureDetail {
  return {
    ...toProcedureSummary(row, now),
    cost_description: row.cost_description,
    official_link: row.official_link,
    form_link: row.form_link,
    steps: bySortOrder(row.steps),
    documents: bySortOrder(row.documents),
    institutions: row.procedure_institutions.map(({ note, institution }) => ({
      ...institution,
      note,
    })),
    life_events: bySortOrder(
      row.life_event_procedures.map((link) => link.life_event),
    ).map(({ slug, title }) => ({ slug, title })),
  };
}
