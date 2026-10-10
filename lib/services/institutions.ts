import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { mapDbError } from "@/lib/api/errors";
import { CATALOG_TAG, institutionTag } from "@/lib/cache/tags";
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
  "use cache";
  // Admin writes expire the tag at once; "hours" (revalidate 1 h) is the safety net of 04 §3.2.
  cacheLife("hours");
  cacheTag(CATALOG_TAG);
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
  const row = await loadInstitutionRow(slug);
  // Mapped outside the cache: the stale flags depend on today (PR-07).
  return row === null ? null : toInstitutionDetail(row, new Date());
}

async function loadInstitutionRow(
  slug: string,
): Promise<InstitutionDetailRow | null> {
  "use cache";
  // Admin writes expire the tag at once; "hours" (revalidate 1 h) is the safety net of 04 §3.2.
  cacheLife("hours");
  const { data: row, error } = await createAnonClient()
    .from("institutions")
    .select(INSTITUTION_DETAIL_SELECT)
    .eq("slug", slug)
    .maybeSingle()
    .overrideTypes<InstitutionDetailRow | null, { merge: false }>();
  if (error) throw mapDbError(error);
  // A miss is tagged with the catalog, which every write expires, so a
  // newly published or renamed institution replaces the cached null.
  cacheTag(row === null ? CATALOG_TAG : institutionTag(row.id));
  return row;
}
