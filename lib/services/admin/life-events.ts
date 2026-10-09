import "server-only";
import { ApiError, mapDbError } from "@/lib/api/errors";
import { writeTags } from "@/lib/cache/tags";
import type { AppSupabaseClient } from "@/lib/supabase/anon";
import {
  ADMIN_LIFE_EVENT_DETAIL_SELECT,
  ADMIN_LIFE_EVENT_SUMMARY_SELECT,
  toLifeEventDetail,
  toLifeEventSummary,
  type LifeEventDetailRow,
  type LifeEventSummaryRow,
} from "../mappers";
import type {
  Dependency,
  LifeEventDetail,
  LifeEventListResponse,
} from "../schemas";
import type {
  AdminListQuery,
  LifeEventProceduresWrite,
  LifeEventWrite,
  StatusChange,
} from "../write-schemas";
import { pageOf, rangeOf, type WriteResult } from "./shared";

// Admin life event reads and writes. Every call runs with the admin's JWT
// (ADR 0004): RLS shows every status and allows the writes, and the audit
// triggers record them.

/** Life events in every status (03 adminListLifeEvents). */
export async function listAdminLifeEvents(
  client: AppSupabaseClient,
  query: AdminListQuery,
): Promise<LifeEventListResponse> {
  let request = client
    .from("life_events")
    .select(ADMIN_LIFE_EVENT_SUMMARY_SELECT, { count: "exact" });
  if (query.status !== undefined) request = request.eq("status", query.status);
  const { data, error, count } = await request
    .order("sort_order")
    .order("title")
    .order("id")
    .range(...rangeOf(query))
    .overrideTypes<LifeEventSummaryRow[], { merge: false }>();
  if (error) throw mapDbError(error);
  return {
    data: data.map(toLifeEventSummary),
    pagination: pageOf(query, count),
  };
}

/** One life event with all its procedures and dependencies, or null. */
export async function getAdminLifeEvent(
  client: AppSupabaseClient,
  id: string,
): Promise<LifeEventDetail | null> {
  const { data: row, error } = await client
    .from("life_events")
    .select(ADMIN_LIFE_EVENT_DETAIL_SELECT)
    .eq("id", id)
    .maybeSingle()
    .overrideTypes<LifeEventDetailRow | null, { merge: false }>();
  if (error) throw mapDbError(error);
  if (row === null) return null;

  const { data: dependencies, error: dependencyError } = await client
    .from("procedure_dependencies")
    .select("life_event_id, procedure_id, depends_on_id")
    .eq("life_event_id", id)
    .overrideTypes<Dependency[], { merge: false }>();
  if (dependencyError) throw mapDbError(dependencyError);
  return toLifeEventDetail(row, dependencies, new Date());
}

async function requireLifeEvent(
  client: AppSupabaseClient,
  id: string,
): Promise<LifeEventDetail> {
  const detail = await getAdminLifeEvent(client, id);
  if (detail === null) throw ApiError.notFound();
  return detail;
}

/** Procedure pages list their life events, so they change with the event. */
function eventTags(detail: LifeEventDetail, extraProcedureIds: string[] = []) {
  return writeTags({
    lifeEventIds: [detail.id],
    procedureIds: [
      ...detail.procedures.map((p) => p.procedure_id),
      ...extraProcedureIds,
    ],
  });
}

/** Creates a draft life event (03 adminCreateLifeEvent). */
export async function createLifeEvent(
  client: AppSupabaseClient,
  input: LifeEventWrite,
): Promise<WriteResult<LifeEventDetail>> {
  const { data, error } = await client
    .from("life_events")
    .insert(input)
    .select("id")
    .single();
  if (error) throw mapDbError(error);
  const detail = await requireLifeEvent(client, data.id);
  return { body: detail, tags: eventTags(detail) };
}

async function updateLifeEventRow(
  client: AppSupabaseClient,
  id: string,
  values: LifeEventWrite | StatusChange,
): Promise<WriteResult<LifeEventDetail>> {
  const { data, error } = await client
    .from("life_events")
    .update(values)
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error) throw mapDbError(error);
  if (data === null) throw ApiError.notFound();
  const detail = await requireLifeEvent(client, id);
  return { body: detail, tags: eventTags(detail) };
}

/**
 * Replaces the event's fields (03 adminUpdateLifeEvent). Publishing an event
 * without a published procedure fails the deferred PR-04 check: 422.
 */
export function updateLifeEvent(
  client: AppSupabaseClient,
  id: string,
  input: LifeEventWrite,
): Promise<WriteResult<LifeEventDetail>> {
  return updateLifeEventRow(client, id, input);
}

/** Publishes, unpublishes or archives the event (03 adminSetLifeEventStatus). */
export function setLifeEventStatus(
  client: AppSupabaseClient,
  id: string,
  change: StatusChange,
): Promise<WriteResult<LifeEventDetail>> {
  return updateLifeEventRow(client, id, change);
}

/**
 * Replaces the event's procedure list in one transaction through
 * admin_set_life_event_procedures() (03 adminSetLifeEventProcedures).
 */
export async function setLifeEventProcedures(
  client: AppSupabaseClient,
  id: string,
  input: LifeEventProceduresWrite,
): Promise<WriteResult<LifeEventDetail>> {
  const before = await getAdminLifeEvent(client, id);
  if (before === null) throw ApiError.notFound();
  const { error } = await client.rpc("admin_set_life_event_procedures", {
    p_life_event_id: id,
    p_procedures: input.procedures,
  });
  if (error) throw mapDbError(error);
  const detail = await requireLifeEvent(client, id);
  // Removed procedures no longer list this event on their pages.
  return {
    body: detail,
    tags: eventTags(
      detail,
      before.procedures.map((p) => p.procedure_id),
    ),
  };
}
