import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { mapDbError } from "@/lib/api/errors";
import { CATALOG_TAG, procedureTag } from "@/lib/cache/tags";
import { createAnonClient } from "@/lib/supabase/anon";
import {
  PROCEDURE_DETAIL_SELECT,
  PROCEDURE_SUMMARY_SELECT,
  toProcedureDetail,
  toProcedureSummary,
  type ProcedureDetailRow,
  type ProcedureSummaryRow,
} from "./mappers";
import type {
  ProcedureDetail,
  ProcedureListQuery,
  ProcedureListResponse,
} from "./schemas";

/**
 * Public procedures (RLS: published and in a published life event, PR-05),
 * alphabetically, optionally only those of one published institution.
 */
export async function listProcedures(
  query: ProcedureListQuery,
): Promise<ProcedureListResponse> {
  const { rows, total } = await loadProcedureRows(query);
  // Mapped outside the cache: the stale flags depend on today (PR-07).
  const now = new Date();
  return {
    data: rows.map((row) => toProcedureSummary(row, now)),
    pagination: { total, limit: query.limit, offset: query.offset },
  };
}

async function loadProcedureRows(
  query: ProcedureListQuery,
): Promise<{ rows: ProcedureSummaryRow[]; total: number }> {
  "use cache";
  // Admin writes expire the tag at once; "hours" (revalidate 1 h) is the safety net of 04 §3.2.
  cacheLife("hours");
  cacheTag(CATALOG_TAG);
  const client = createAnonClient();

  // Why resolve the slug first: filtering through two embedded levels
  // (link row, then institution) is easy to get subtly wrong in PostgREST,
  // while one lookup keeps the procedure query a plain inner join.
  let institutionId: string | undefined;
  if (query.institution_slug !== undefined) {
    const { data, error } = await client
      .from("institutions")
      .select("id")
      .eq("slug", query.institution_slug)
      .maybeSingle();
    if (error) throw mapDbError(error);
    if (data === null) return { rows: [], total: 0 };
    institutionId = data.id;
  }

  let request = client
    .from("procedures")
    .select(
      institutionId === undefined
        ? PROCEDURE_SUMMARY_SELECT
        : `${PROCEDURE_SUMMARY_SELECT}, procedure_institutions!inner(institution_id)`,
      { count: "exact" },
    );
  if (institutionId !== undefined) {
    request = request.eq(
      "procedure_institutions.institution_id",
      institutionId,
    );
  }
  const { data, error, count } = await request
    .order("title")
    .order("id")
    .range(query.offset, query.offset + query.limit - 1)
    .overrideTypes<ProcedureSummaryRow[], { merge: false }>();
  if (error) throw mapDbError(error);
  return { rows: data, total: count ?? 0 };
}

/**
 * One public procedure with steps, documents, institutions and life events,
 * or null. RLS returns nothing for a draft procedure or one that is not in a
 * published life event (PR-05), so both become 404 in the handler.
 */
export async function getProcedureBySlug(
  slug: string,
): Promise<ProcedureDetail | null> {
  const row = await loadProcedureRow(slug);
  // Mapped outside the cache: the stale flag depends on today (PR-07).
  return row === null ? null : toProcedureDetail(row, new Date());
}

async function loadProcedureRow(
  slug: string,
): Promise<ProcedureDetailRow | null> {
  "use cache";
  // Admin writes expire the tag at once; "hours" (revalidate 1 h) is the safety net of 04 §3.2.
  cacheLife("hours");
  const { data: row, error } = await createAnonClient()
    .from("procedures")
    .select(PROCEDURE_DETAIL_SELECT)
    .eq("slug", slug)
    .maybeSingle()
    .overrideTypes<ProcedureDetailRow | null, { merge: false }>();
  if (error) throw mapDbError(error);
  // A miss is tagged with the catalog, which every write expires, so a
  // newly published or renamed procedure replaces the cached null.
  cacheTag(row === null ? CATALOG_TAG : procedureTag(row.id));
  return row;
}
