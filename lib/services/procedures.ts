import "server-only";
import { mapDbError } from "@/lib/api/errors";
import { createAnonClient } from "@/lib/supabase/anon";
import {
  PROCEDURE_DETAIL_SELECT,
  toProcedureDetail,
  type ProcedureDetailRow,
} from "./mappers";
import type { ProcedureDetail } from "./schemas";

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
