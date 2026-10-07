import "server-only";
import { createClient } from "@supabase/supabase-js";
import { getServiceRoleEnv } from "@/lib/env";
import type { Database } from "@/types/database";
import type { AppSupabaseClient } from "./anon";

/**
 * Service-role client. Bypasses RLS, so it is restricted to the AI route: the
 * `ai_queries` insert and the `ai_rate_limit_hit()` call (ADR 0004, 04 §5.2).
 * ESLint forbids importing this module anywhere except `lib/ai/` and
 * `app/api/v1/ai/`. The database also rejects content writes from this role.
 */
export function createServiceRoleClient(): AppSupabaseClient {
  const env = getServiceRoleEnv();
  return createClient<Database>(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
