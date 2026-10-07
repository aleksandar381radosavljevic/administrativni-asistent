import "server-only";
import { ApiError, mapDbError } from "@/lib/api/errors";
import { writeTags } from "@/lib/cache/tags";
import type { AppSupabaseClient } from "@/lib/supabase/anon";
import type { Synonym, SynonymListResponse } from "../schemas";
import { escapeLike } from "../search";
import type { SynonymListQuery, SynonymWrite } from "../write-schemas";
import { pageOf, rangeOf, type WriteResult } from "./shared";

// Search synonyms (03 Admin / Synonyms). Synonyms are search vocabulary, not
// content: they are deleted, not archived, and the deletion is audited. The
// AI content catalog includes them, so writes invalidate `catalog`.

const SYNONYM_SELECT = "id, term, maps_to, created_at";

/**
 * A PostgREST `or` filter value: double-quoted, with `"` and `\` escaped, so
 * commas and parentheses in the search text stay literal.
 */
export function quoteFilterValue(value: string): string {
  return `"${value.replace(/["\\]/g, (char) => `\\${char}`)}"`;
}

export async function listSynonyms(
  client: AppSupabaseClient,
  query: SynonymListQuery,
): Promise<SynonymListResponse> {
  let request = client
    .from("synonyms")
    .select(SYNONYM_SELECT, { count: "exact" });
  if (query.q !== undefined) {
    const pattern = quoteFilterValue(`%${escapeLike(query.q)}%`);
    request = request.or(`term.ilike.${pattern},maps_to.ilike.${pattern}`);
  }
  const { data, error, count } = await request
    .order("term")
    .order("id")
    .range(...rangeOf(query));
  if (error) throw mapDbError(error);
  return { data, pagination: pageOf(query, count) };
}

export async function createSynonym(
  client: AppSupabaseClient,
  input: SynonymWrite,
): Promise<WriteResult<Synonym>> {
  const { data, error } = await client
    .from("synonyms")
    .insert(input)
    .select(SYNONYM_SELECT)
    .single();
  if (error) throw mapDbError(error);
  return { body: data, tags: writeTags({}) };
}

export async function updateSynonym(
  client: AppSupabaseClient,
  id: string,
  input: SynonymWrite,
): Promise<WriteResult<Synonym>> {
  const { data, error } = await client
    .from("synonyms")
    .update(input)
    .eq("id", id)
    .select(SYNONYM_SELECT)
    .maybeSingle();
  if (error) throw mapDbError(error);
  if (data === null) throw ApiError.notFound();
  return { body: data, tags: writeTags({}) };
}

export async function deleteSynonym(
  client: AppSupabaseClient,
  id: string,
): Promise<WriteResult<null>> {
  const { data, error } = await client
    .from("synonyms")
    .delete()
    .eq("id", id)
    .select("id");
  if (error) throw mapDbError(error);
  if (data.length === 0) throw ApiError.notFound();
  return { body: null, tags: writeTags({}) };
}
