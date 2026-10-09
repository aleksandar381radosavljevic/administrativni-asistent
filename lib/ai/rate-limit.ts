import "server-only";
import { createHmac } from "node:crypto";
import { mapDbError } from "@/lib/api/errors";
import { getAiEnv } from "@/lib/env";
import { format, minutesLabel } from "@/lib/i18n/format";
import { labels } from "@/lib/i18n/labels";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

// AI rate limit (04 §4.4): a fixed window per clock hour, counted in Postgres
// because serverless instances share no memory.

export const AI_RATE_LIMIT_PER_HOUR = 10;

const HOUR_MS = 60 * 60 * 1000;

/**
 * HMAC-SHA-256 of the client IP, keyed with the secret salt plus the UTC
 * date, as lowercase hex (ai_rate_limits.ip_hash). Why the date: the key
 * rotates daily, so a stored hash cannot be linked to the same client on
 * another day, and without the salt it cannot be reversed by trying all IPs.
 */
export function hashClientIp(ip: string, salt: string, now: Date): string {
  const day = now.toISOString().slice(0, 10);
  return createHmac("sha256", `${salt}:${day}`).update(ip).digest("hex");
}

/** Whole seconds until the next full hour, at least 1 (03 Retry-After). */
export function secondsUntilNextHour(now: Date): number {
  const remainingMs = HOUR_MS - (now.getTime() % HOUR_MS);
  return Math.max(1, Math.ceil(remainingMs / 1000));
}

/**
 * The client IP as Vercel reports it. Vercel sets `x-real-ip` and overwrites
 * `x-forwarded-for`, so neither can be spoofed there. Locally neither header
 * exists and every request shares one bucket, which is fine for development.
 */
export function clientIp(headers: Headers): string {
  const realIp = headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || "unknown";
}

export type RateLimitResult =
  { allowed: true } | { allowed: false; retryAfterSeconds: number };

/**
 * Counts this request against the client's hourly window and says whether it
 * may go on. Call it before any Anthropic call. A database error throws (fail
 * closed): an unlimited AI route would spend money without bound.
 */
export async function hitRateLimit(
  headers: Headers,
  now: Date = new Date(),
): Promise<RateLimitResult> {
  const ipHash = hashClientIp(
    clientIp(headers),
    getAiEnv().AI_RATE_LIMIT_SALT,
    now,
  );
  const { data: allowed, error } = await createServiceRoleClient().rpc(
    "ai_rate_limit_hit",
    { p_ip_hash: ipHash, p_limit: AI_RATE_LIMIT_PER_HOUR },
  );
  if (error) throw mapDbError(error);
  return allowed
    ? { allowed: true }
    : { allowed: false, retryAfterSeconds: secondsUntilNextHour(now) };
}

/** 03 TooManyRequests: Serbian message, `retry_after_seconds` and `Retry-After`. */
export function rateLimitedResponse(retryAfterSeconds: number): Response {
  const message = format(labels.apiErrors.rateLimited, {
    limit: AI_RATE_LIMIT_PER_HOUR,
    minutes: minutesLabel(Math.ceil(retryAfterSeconds / 60)),
  });
  return Response.json(
    {
      error: "rate_limited",
      message,
      retry_after_seconds: retryAfterSeconds,
    },
    { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } },
  );
}
