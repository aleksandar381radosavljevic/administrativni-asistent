import "server-only";
import { mapDbError } from "@/lib/api/errors";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export interface AiQueryRecord {
  /** The last user message, already redacted (ADR 0007). */
  query_text: string;
  was_answered: boolean;
  matched_event_id: string | null;
}

/**
 * Stores one question for the admin's view of unanswered topics (UF-10).
 * Service role, because anon has no insert grant on ai_queries (04 §5.2).
 * No IP or IP hash is stored here.
 */
export async function recordAiQuery(record: AiQueryRecord): Promise<void> {
  const { error } = await createServiceRoleClient()
    .from("ai_queries")
    .insert(record);
  if (error) throw mapDbError(error);
}
