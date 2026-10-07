export const STALE_THRESHOLD_MONTHS = 6;

/**
 * A procedure is stale when it was never verified or its last verification
 * is more than six calendar months old (PR-07, ADR 0011).
 */
export function isStale(
  lastVerifiedAt: string | null,
  now: Date = new Date(),
): boolean {
  if (lastVerifiedAt === null) return true;
  const verified = new Date(lastVerifiedAt);
  if (Number.isNaN(verified.getTime())) return true;
  const threshold = new Date(now);
  threshold.setUTCMonth(threshold.getUTCMonth() - STALE_THRESHOLD_MONTHS);
  return verified < threshold;
}
