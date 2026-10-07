import "server-only";
import { mapDbError } from "@/lib/api/errors";
import { createAnonClient } from "@/lib/supabase/anon";
import {
  LIFE_EVENT_DETAIL_SELECT,
  LIFE_EVENT_SUMMARY_SELECT,
  toLifeEventDetail,
  toLifeEventSummary,
  type LifeEventDetailRow,
  type LifeEventSummaryRow,
} from "./mappers";
import type {
  Dependency,
  LifeEventDetail,
  LifeEventListQuery,
  LifeEventListResponse,
} from "./schemas";

/** Published life events with at least one public procedure, optionally by category. */
export async function listLifeEvents(
  query: LifeEventListQuery,
): Promise<LifeEventListResponse> {
  let request = createAnonClient()
    .from("life_events")
    .select(LIFE_EVENT_SUMMARY_SELECT, { count: "exact" });
  if (query.category_slug !== undefined) {
    request = request.eq("category.slug", query.category_slug);
  }
  const { data, error, count } = await request
    .order("sort_order")
    .order("title")
    .order("id")
    .range(query.offset, query.offset + query.limit - 1)
    .overrideTypes<LifeEventSummaryRow[], { merge: false }>();
  if (error) throw mapDbError(error);
  return {
    data: data.map(toLifeEventSummary),
    pagination: { total: count ?? 0, limit: query.limit, offset: query.offset },
  };
}

/** One published life event with its public procedures and dependencies, or null. */
export async function getLifeEventBySlug(
  slug: string,
): Promise<LifeEventDetail | null> {
  const client = createAnonClient();
  const { data: row, error } = await client
    .from("life_events")
    .select(LIFE_EVENT_DETAIL_SELECT)
    .eq("slug", slug)
    .maybeSingle()
    .overrideTypes<LifeEventDetailRow | null, { merge: false }>();
  if (error) throw mapDbError(error);
  if (row === null) return null;

  // A separate query: procedure_dependencies references life_event_procedures
  // through two composite keys, which PostgREST cannot embed unambiguously.
  const { data: dependencies, error: dependencyError } = await client
    .from("procedure_dependencies")
    .select("life_event_id, procedure_id, depends_on_id")
    .eq("life_event_id", row.id)
    .overrideTypes<Dependency[], { merge: false }>();
  if (dependencyError) throw mapDbError(dependencyError);

  return toLifeEventDetail(row, dependencies, new Date());
}
