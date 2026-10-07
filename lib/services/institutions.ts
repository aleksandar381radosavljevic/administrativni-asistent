import "server-only";
import { mapDbError } from "@/lib/api/errors";
import { createAnonClient } from "@/lib/supabase/anon";
import {
  INSTITUTION_DETAIL_SELECT,
  INSTITUTION_SUMMARY_SELECT,
  toInstitutionDetail,
  type InstitutionDetailRow,
} from "./mappers";
import type {
  InstitutionDetail,
  InstitutionListResponse,
  InstitutionSummary,
  PaginationQuery,
} from "./schemas";

/** Published institutions (RLS), alphabetically. */
export async function listInstitutions(
  query: PaginationQuery,
): Promise<InstitutionListResponse> {
  const { data, error, count } = await createAnonClient()
    .from("institutions")
    .select(INSTITUTION_SUMMARY_SELECT, { count: "exact" })
    .order("name")
    .order("id")
    .range(query.offset, query.offset + query.limit - 1)
    .overrideTypes<InstitutionSummary[], { merge: false }>();
  if (error) throw mapDbError(error);
  return {
    data,
    pagination: { total: count ?? 0, limit: query.limit, offset: query.offset },
  };
}

/**
 * One published institution with its public procedures, or null. RLS hides
 * the links to draft procedures and to procedures outside a published life
 * event (PR-05).
 */
export async function getInstitutionBySlug(
  slug: string,
): Promise<InstitutionDetail | null> {
  const { data: row, error } = await createAnonClient()
    .from("institutions")
    .select(INSTITUTION_DETAIL_SELECT)
    .eq("slug", slug)
    .maybeSingle()
    .overrideTypes<InstitutionDetailRow | null, { merge: false }>();
  if (error) throw mapDbError(error);
  return row === null ? null : toInstitutionDetail(row, new Date());
}
