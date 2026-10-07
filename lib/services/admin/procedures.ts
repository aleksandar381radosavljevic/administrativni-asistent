import "server-only";
import { ApiError, mapDbError } from "@/lib/api/errors";
import { writeTags } from "@/lib/cache/tags";
import { STALE_THRESHOLD_MONTHS } from "@/lib/domain/is-stale";
import type { AppSupabaseClient } from "@/lib/supabase/anon";
import {
  PROCEDURE_DETAIL_SELECT,
  PROCEDURE_SUMMARY_SELECT,
  toProcedureDetail,
  toProcedureSummary,
  type ProcedureDetailRow,
  type ProcedureSummaryRow,
} from "../mappers";
import type {
  PaginationQuery,
  ProcedureDetail,
  ProcedureListResponse,
} from "../schemas";
import type {
  AdminListQuery,
  ProcedurePatch,
  ProcedureWrite,
} from "../write-schemas";
import { pageOf, rangeOf, type WriteResult } from "./shared";

// Admin procedure reads and writes, with the admin's JWT (ADR 0004).

function toListResponse(
  rows: ProcedureSummaryRow[],
  query: PaginationQuery,
  count: number | null,
): ProcedureListResponse {
  const now = new Date();
  return {
    data: rows.map((row) => toProcedureSummary(row, now)),
    pagination: pageOf(query, count),
  };
}

/** Procedures in every status, linked or not (03 adminListProcedures). */
export async function listAdminProcedures(
  client: AppSupabaseClient,
  query: AdminListQuery,
): Promise<ProcedureListResponse> {
  let request = client
    .from("procedures")
    .select(PROCEDURE_SUMMARY_SELECT, { count: "exact" });
  if (query.status !== undefined) request = request.eq("status", query.status);
  const { data, error, count } = await request
    .order("title")
    .order("id")
    .range(...rangeOf(query))
    .overrideTypes<ProcedureSummaryRow[], { merge: false }>();
  if (error) throw mapDbError(error);
  return toListResponse(data, query, count);
}

/**
 * Procedures due for verification (03 adminListStaleProcedures, PR-07):
 * never verified first, then the oldest verification. Archived procedures
 * are left out: nobody needs to re-check withdrawn content.
 */
export async function listStaleProcedures(
  client: AppSupabaseClient,
  query: PaginationQuery,
  now: Date = new Date(),
): Promise<ProcedureListResponse> {
  const threshold = new Date(now);
  threshold.setUTCMonth(threshold.getUTCMonth() - STALE_THRESHOLD_MONTHS);
  const { data, error, count } = await client
    .from("procedures")
    .select(PROCEDURE_SUMMARY_SELECT, { count: "exact" })
    .neq("status", "archived")
    .or(
      `last_verified_at.is.null,last_verified_at.lt.${threshold.toISOString()}`,
    )
    .order("last_verified_at", { ascending: true, nullsFirst: true })
    .order("title")
    .order("id")
    .range(...rangeOf(query))
    .overrideTypes<ProcedureSummaryRow[], { merge: false }>();
  if (error) throw mapDbError(error);
  return toListResponse(data, query, count);
}

/** One procedure in any status with all its life events, or null. */
export async function getAdminProcedure(
  client: AppSupabaseClient,
  id: string,
): Promise<ProcedureDetail | null> {
  const { data: row, error } = await client
    .from("procedures")
    .select(PROCEDURE_DETAIL_SELECT)
    .eq("id", id)
    .maybeSingle()
    .overrideTypes<ProcedureDetailRow | null, { merge: false }>();
  if (error) throw mapDbError(error);
  return row === null ? null : toProcedureDetail(row, new Date());
}

interface ProcedureRelations {
  lifeEventIds: string[];
  institutionIds: string[];
}

/** Life events and institutions whose public pages show this procedure. */
async function relationsOf(
  client: AppSupabaseClient,
  id: string,
): Promise<ProcedureRelations> {
  const { data, error } = await client
    .from("procedures")
    .select(
      "life_event_procedures(life_event_id), procedure_institutions(institution_id)",
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw mapDbError(error);
  return {
    lifeEventIds: (data?.life_event_procedures ?? []).map(
      (link) => link.life_event_id,
    ),
    institutionIds: (data?.procedure_institutions ?? []).map(
      (link) => link.institution_id,
    ),
  };
}

function procedureTags(id: string, ...relations: ProcedureRelations[]) {
  return writeTags({
    procedureIds: [id],
    lifeEventIds: relations.flatMap((r) => r.lifeEventIds),
    institutionIds: relations.flatMap((r) => r.institutionIds),
  });
}

async function requireProcedure(
  client: AppSupabaseClient,
  id: string,
): Promise<ProcedureDetail> {
  const detail = await getAdminProcedure(client, id);
  if (detail === null) throw ApiError.notFound();
  return detail;
}

/**
 * Creates (no id) or replaces a procedure with its full lists of steps,
 * documents and institution links in one transaction, through
 * admin_save_procedure() (03 adminCreateProcedure, adminUpdateProcedure).
 */
export async function saveProcedure(
  client: AppSupabaseClient,
  input: ProcedureWrite,
  id?: string,
): Promise<WriteResult<ProcedureDetail>> {
  const before =
    id === undefined
      ? { lifeEventIds: [], institutionIds: [] }
      : await relationsOf(client, id);
  const { data: savedId, error } = await client.rpc("admin_save_procedure", {
    p_procedure: input,
    p_id: id,
  });
  if (error) throw mapDbError(error);
  const detail = await requireProcedure(client, savedId);
  const after = await relationsOf(client, savedId);
  return { body: detail, tags: procedureTags(savedId, before, after) };
}

/** Changes status and/or last_verified_at (03 adminPatchProcedure). */
export async function patchProcedure(
  client: AppSupabaseClient,
  id: string,
  patch: ProcedurePatch,
): Promise<WriteResult<ProcedureDetail>> {
  const { data, error } = await client
    .from("procedures")
    .update(patch)
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error) throw mapDbError(error);
  if (data === null) throw ApiError.notFound();
  const detail = await requireProcedure(client, id);
  return {
    body: detail,
    tags: procedureTags(id, await relationsOf(client, id)),
  };
}
