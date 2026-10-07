import "server-only";
import { ApiError } from "@/lib/api/errors";
import { type AppSupabaseClient } from "@/lib/supabase/anon";
import { createSessionClient, createUserClient } from "@/lib/supabase/user";
import { bearerToken, isAdminClaims } from "./claims";

export interface AdminContext {
  /** Acts as the admin: RLS checks the admin claim, triggers audit auth.uid(). */
  client: AppSupabaseClient;
  userId: string;
}

/**
 * Verifies the caller of an /api/v1/admin/** handler (ADR 0004, 04 §4.2).
 *
 * The token comes from `Authorization: Bearer` (API clients) or, without that
 * header, from the httpOnly session cookies of the admin panel (04 §6).
 * getClaims() verifies the JWT signature (locally with asymmetric keys, or
 * through the Auth server for symmetric ones) and its expiry; a session read
 * alone would trust whatever the cookie says. Missing or invalid: 401. Valid
 * without `app_metadata.role = 'admin'`: 403 (03).
 *
 * The returned client sends the same JWT to Supabase, so RLS and the audit
 * triggers enforce and record the change independently of this check.
 */
export async function requireAdmin(request: Request): Promise<AdminContext> {
  const header = request.headers.get("authorization");
  let client: AppSupabaseClient;
  let token: string | undefined;
  if (header === null) {
    client = await createSessionClient();
  } else {
    token = bearerToken(header);
    if (token === undefined) throw ApiError.unauthorized();
    client = createUserClient(token);
  }

  const { data, error } = await client.auth.getClaims(token);
  if (error !== null || data === null) throw ApiError.unauthorized();
  if (!isAdminClaims(data.claims)) throw ApiError.forbidden();
  return { client, userId: data.claims.sub };
}
