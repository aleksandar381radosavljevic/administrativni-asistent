import "server-only";
import { mapDbError } from "@/lib/api/errors";
import type { AppSupabaseClient } from "@/lib/supabase/anon";
import type {
  AiQuery,
  AiQueryListResponse,
  AiQueryStatsResponse,
} from "../schemas";
import type { AiQueryListQuery, AiQueryStatsQuery } from "../write-schemas";
import { pageOf, rangeOf } from "./shared";

// Redacted AI questions for the admin (UF-10, 03 Admin / Queries). Read-only;
// rows are inserted by the AI route and purged after 90 days (ADR 0007).

export async function listAiQueries(
  client: AppSupabaseClient,
  query: AiQueryListQuery,
): Promise<AiQueryListResponse> {
  let request = client
    .from("ai_queries")
    .select("id, query_text, was_answered, matched_event_id, created_at", {
      count: "exact",
    });
  if (query.was_answered !== undefined) {
    request = request.eq("was_answered", query.was_answered);
  }
  if (query.from !== undefined) request = request.gte("created_at", query.from);
  if (query.to !== undefined) request = request.lt("created_at", query.to);
  const { data, error, count } = await request
    .order("created_at", { ascending: false })
    .order("id")
    .range(...rangeOf(query))
    .overrideTypes<AiQuery[], { merge: false }>();
  if (error) throw mapDbError(error);
  return { data, pagination: pageOf(query, count) };
}

/** Query counts per matched life event, highest first (03 adminAiQueryStats). */
export async function aiQueryStats(
  client: AppSupabaseClient,
  query: AiQueryStatsQuery,
): Promise<AiQueryStatsResponse> {
  const { data, error } = await client.rpc("admin_ai_query_stats", {
    p_from: query.from,
    p_to: query.to,
  });
  if (error) throw mapDbError(error);
  return {
    data: data.map((row) => ({
      life_event:
        row.life_event_id === null
          ? null
          : { id: row.life_event_id, slug: row.slug, title: row.title },
      count: row.count,
      unanswered_count: row.unanswered_count,
    })),
  };
}
