import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseEnv } from "@/lib/env";
import type { Database } from "@/types/database";

export type AppSupabaseClient = SupabaseClient<Database>;

/**
 * Client for public reads: anon key, under RLS, published content only
 * (ADR 0004). Never use it for writes, and never use the service role for
 * public reads: a query bug must not be able to show draft content.
 */
export function createAnonClient(): AppSupabaseClient {
  const env = getSupabaseEnv();
  return createClient<Database>(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
