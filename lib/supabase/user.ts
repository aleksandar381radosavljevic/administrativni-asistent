import "server-only";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { getSupabaseEnv } from "@/lib/env";
import type { Database } from "@/types/database";
import type { AppSupabaseClient } from "./anon";

/**
 * Client acting as the caller, for every admin read and write (ADR 0004):
 * anon key plus the caller's JWT, so RLS checks the admin claim and the audit
 * triggers record auth.uid(). Used with an `Authorization: Bearer` token from
 * API clients. The route handler must still verify the token and the admin
 * role itself before calling a service (04 §4.2).
 */
export function createUserClient(accessToken: string): AppSupabaseClient {
  const env = getSupabaseEnv();
  return createClient<Database>(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}

/**
 * Same as createUserClient, but reads (and refreshes) the session from the
 * httpOnly Supabase cookies set for the admin panel (04 §6).
 */
export async function createSessionClient(): Promise<AppSupabaseClient> {
  const env = getSupabaseEnv();
  const cookieStore = await cookies();
  return createServerClient<Database>(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component, where cookies are read-only. The
          // session is refreshed by the next route handler or server action.
        }
      },
    },
  });
}
