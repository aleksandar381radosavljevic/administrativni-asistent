// Pure helpers for admin authentication, kept apart from the Supabase clients
// so they are unit-tested without a server.

/** The token of an `Authorization: Bearer <token>` header, or undefined. */
export function bearerToken(header: string): string | undefined {
  const match = /^Bearer\s+(\S+)\s*$/i.exec(header);
  return match?.[1];
}

/**
 * True when verified JWT claims carry `app_metadata.role = 'admin'`, the same
 * rule as `private.is_admin()` in the database (ADR 0004). app_metadata can
 * only be set server-side, so a user cannot grant it to themselves.
 */
export function isAdminClaims(claims: {
  sub?: unknown;
  app_metadata?: unknown;
}): boolean {
  if (typeof claims.sub !== "string" || claims.sub === "") return false;
  const appMetadata = claims.app_metadata;
  return (
    typeof appMetadata === "object" &&
    appMetadata !== null &&
    (appMetadata as Record<string, unknown>).role === "admin"
  );
}
