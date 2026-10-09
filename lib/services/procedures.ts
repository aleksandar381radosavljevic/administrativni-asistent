import "server-only";
import { mapDbError } from "@/lib/api/errors";
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
  const client = createAnonClient();
  const empty = {
    data: [],
    pagination: { total: 0, limit: query.limit, offset: query.offset },
  };

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
    if (data === null) return empty;
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

  const now = new Date();
  return {
    data: data.map((row) => toProcedureSummary(row, now)),
    pagination: { total: count ?? 0, limit: query.limit, offset: query.offset },
  };
}

/**
 * One public procedure with steps, documents, institutions and life events,
 * or null. RLS returns nothing for a draft procedure or one that is not in a
 * published life event (PR-05), so both become 404 in the handler.
 */
export async function getProcedureBySlug(
  slug: string,
): Promise<ProcedureDetail | null> {
  const { data: row, error } = await createAnonClient()
    .from("procedures")
    .select(PROCEDURE_DETAIL_SELECT)
    .eq("slug", slug)
    .maybeSingle()
    .overrideTypes<ProcedureDetailRow | null, { merge: false }>();
  if (error) throw mapDbError(error);
  return row === null ? null : toProcedureDetail(row, new Date());
}
