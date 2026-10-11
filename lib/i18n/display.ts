import { format } from "@/lib/i18n/format";
import { labels } from "@/lib/i18n/labels";
import type { ProcedureInEvent } from "@/lib/services/schemas";

const LOCALE = "sr-Latn-RS";

const wholeAmount = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 0 });
const centsAmount = new Intl.NumberFormat(LOCALE, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * Cost line by `cost_type` (08 §0.7). The amount stays a decimal string end
 * to end (05 §4): Intl formats the string exactly, without a float.
 */
export function formatCost(
  costType: ProcedureInEvent["cost_type"],
  costAmount: string | null,
): string {
  if (costType !== "fixed") return labels.cost[costType];
  if (costAmount === null) return labels.cost.unknown;
  const hasCents = !/\.0+$/.test(costAmount);
  // Intl accepts decimal strings; the DOM lib types only list number | bigint.
  const amount = (hasCents ? centsAmount : wholeAmount).format(
    costAmount as unknown as number,
  );
  return format(labels.cost.fixed, { amount });
}

const longDate = new Intl.DateTimeFormat(LOCALE, {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "Europe/Belgrade",
});

/** "5. oktobar 2026." (08 §0.7), in Serbian time so the day does not shift. */
export function formatDate(isoTimestamp: string): string {
  return longDate.format(new Date(isoTimestamp));
}

export type ProcedureMethod = keyof typeof labels.methods;

/** The ways a procedure can be done, in the fixed display order. */
export function procedureMethods(
  procedure: Pick<ProcedureInEvent, ProcedureMethod>,
): ProcedureMethod[] {
  const order: ProcedureMethod[] = [
    "can_online",
    "can_in_person",
    "can_by_mail",
  ];
  return order.filter((method) => procedure[method]);
}
