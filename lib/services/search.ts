import "server-only";
import { mapDbError } from "@/lib/api/errors";
import { createAnonClient, type AppSupabaseClient } from "@/lib/supabase/anon";
import {
  INSTITUTION_SUMMARY_SELECT,
  LIFE_EVENT_SUMMARY_SELECT,
  PROCEDURE_SUMMARY_SELECT,
  toLifeEventSummary,
  toProcedureSummary,
  type LifeEventSummaryRow,
  type ProcedureSummaryRow,
} from "./mappers";
import type {
  InstitutionSummary,
  SearchQuery,
  SearchResponse,
} from "./schemas";

/** Keeps items in the order of `ids` (search rank) and drops unknown ones. */
export function orderByIds<T extends { id: string }>(
  items: readonly T[],
  ids: readonly string[],
): T[] {
  const byId = new Map(items.map((item) => [item.id, item]));
  return ids.flatMap((id) => byId.get(id) ?? []);
}

/** Escapes LIKE wildcards so user input matches literally. */
export function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}

/**
 * The term a synonym maps the query to, when the whole query is a known
 * synonym; otherwise the query itself. search_content() applies synonyms
 * internally; this only fills SearchResponse.query.
 */
async function mappedQuery(
  client: AppSupabaseClient,
  q: string,
): Promise<string> {
  const { data, error } = await client
    .from("synonyms")
    .select("maps_to")
    .ilike("term", escapeLike(q))
    .limit(1);
  if (error) throw mapDbError(error);
  return data[0]?.maps_to ?? q;
}

/**
 * Full-text search over public content (04 §5.3): search_content() ranks the
 * hits under the caller's RLS, then the summaries are loaded per kind.
 */
export async function search({
  q,
  limit,
}: SearchQuery): Promise<SearchResponse> {
  const client = createAnonClient();
  const { data: hits, error } = await client.rpc("search_content", {
    q,
    max_results: limit,
  });
  if (error) throw mapDbError(error);

  const idsOf = (kind: string) =>
    hits.filter((hit) => hit.kind === kind).map((hit) => hit.id);
  const eventIds = idsOf("life_event");
  const procedureIds = idsOf("procedure");
  const institutionIds = idsOf("institution");

  const [events, procedures, institutions, query] = await Promise.all([
    eventIds.length === 0
      ? { data: [], error: null }
      : client
          .from("life_events")
          .select(LIFE_EVENT_SUMMARY_SELECT)
          .in("id", eventIds)
          .overrideTypes<LifeEventSummaryRow[], { merge: false }>(),
    procedureIds.length === 0
      ? { data: [], error: null }
      : client
          .from("procedures")
          .select(PROCEDURE_SUMMARY_SELECT)
          .in("id", procedureIds)
          .overrideTypes<ProcedureSummaryRow[], { merge: false }>(),
    institutionIds.length === 0
      ? { data: [], error: null }
      : client
          .from("institutions")
          .select(INSTITUTION_SUMMARY_SELECT)
          .in("id", institutionIds)
          .overrideTypes<InstitutionSummary[], { merge: false }>(),
    mappedQuery(client, q),
  ]);
  for (const result of [events, procedures, institutions]) {
    if (result.error) throw mapDbError(result.error);
  }

  const now = new Date();
  const response = {
    query,
    original_query: q,
    life_events: orderByIds(events.data ?? [], eventIds).map(
      toLifeEventSummary,
    ),
    procedures: orderByIds(procedures.data ?? [], procedureIds).map((row) =>
      toProcedureSummary(row, now),
    ),
    institutions: orderByIds(institutions.data ?? [], institutionIds),
  };
  return {
    ...response,
    total_count:
      response.life_events.length +
      response.procedures.length +
      response.institutions.length,
  };
}
