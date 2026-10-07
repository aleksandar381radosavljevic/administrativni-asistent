import "server-only";
import { ApiError, mapDbError } from "@/lib/api/errors";
import { writeTags } from "@/lib/cache/tags";
import type { AppSupabaseClient } from "@/lib/supabase/anon";
import { INSTITUTION_SELECT, INSTITUTION_SUMMARY_SELECT } from "../mappers";
import type {
  Institution,
  InstitutionListResponse,
  InstitutionSummary,
} from "../schemas";
import type {
  AdminListQuery,
  InstitutionWrite,
  StatusChange,
} from "../write-schemas";
import { pageOf, rangeOf, type WriteResult } from "./shared";

// Admin institution reads and writes, with the admin's JWT (ADR 0004).

/** Institutions in every status (03 adminListInstitutions). */
export async function listAdminInstitutions(
  client: AppSupabaseClient,
  query: AdminListQuery,
): Promise<InstitutionListResponse> {
  let request = client
    .from("institutions")
    .select(INSTITUTION_SUMMARY_SELECT, { count: "exact" });
  if (query.status !== undefined) request = request.eq("status", query.status);
  const { data, error, count } = await request
    .order("name")
    .order("id")
    .range(...rangeOf(query))
    .overrideTypes<InstitutionSummary[], { merge: false }>();
  if (error) throw mapDbError(error);
  return { data, pagination: pageOf(query, count) };
}

export async function getAdminInstitution(
  client: AppSupabaseClient,
  id: string,
): Promise<Institution | null> {
  const { data, error } = await client
    .from("institutions")
    .select(INSTITUTION_SELECT)
    .eq("id", id)
    .maybeSingle()
    .overrideTypes<Institution | null, { merge: false }>();
  if (error) throw mapDbError(error);
  return data;
}

/**
 * Procedures that show this institution, and their life events (event pages
 * list each procedure's institutions), for cache invalidation.
 */
async function institutionTags(client: AppSupabaseClient, id: string) {
  const { data, error } = await client
    .from("procedure_institutions")
    .select(
      "procedure_id, procedure:procedures!inner(life_event_procedures(life_event_id))",
    )
    .eq("institution_id", id)
    .overrideTypes<
      {
        procedure_id: string;
        procedure: { life_event_procedures: { life_event_id: string }[] };
      }[],
      { merge: false }
    >();
  if (error) throw mapDbError(error);
  return writeTags({
    institutionIds: [id],
    procedureIds: data.map((link) => link.procedure_id),
    lifeEventIds: data.flatMap((link) =>
      link.procedure.life_event_procedures.map((e) => e.life_event_id),
    ),
  });
}

export async function createInstitution(
  client: AppSupabaseClient,
  input: InstitutionWrite,
): Promise<WriteResult<Institution>> {
  const { data, error } = await client
    .from("institutions")
    .insert(input)
    .select(INSTITUTION_SELECT)
    .single()
    .overrideTypes<Institution, { merge: false }>();
  if (error) throw mapDbError(error);
  return { body: data, tags: writeTags({ institutionIds: [data.id] }) };
}

async function updateInstitutionRow(
  client: AppSupabaseClient,
  id: string,
  values: InstitutionWrite | StatusChange,
): Promise<WriteResult<Institution>> {
  const { data, error } = await client
    .from("institutions")
    .update(values)
    .eq("id", id)
    .select(INSTITUTION_SELECT)
    .maybeSingle()
    .overrideTypes<Institution | null, { merge: false }>();
  if (error) throw mapDbError(error);
  if (data === null) throw ApiError.notFound();
  return { body: data, tags: await institutionTags(client, id) };
}

/** 03 adminUpdateInstitution. */
export function updateInstitution(
  client: AppSupabaseClient,
  id: string,
  input: InstitutionWrite,
): Promise<WriteResult<Institution>> {
  return updateInstitutionRow(client, id, input);
}

/** 03 adminSetInstitutionStatus. */
export function setInstitutionStatus(
  client: AppSupabaseClient,
  id: string,
  change: StatusChange,
): Promise<WriteResult<Institution>> {
  return updateInstitutionRow(client, id, change);
}
