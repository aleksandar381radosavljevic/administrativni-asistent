/**
 * Fills `{name}` placeholders in a label (05 §2). A placeholder without a
 * value is left as is, so a missing value is visible instead of silently empty.
 */
export function format(
  label: string,
  values: Record<string, string | number>,
): string {
  return label.replace(/\{(\w+)\}/g, (placeholder, name: string) =>
    name in values ? String(values[name]) : placeholder,
  );
}

/**
 * "1 minut", "2 minuta", "21 minut", "11 minuta": Serbian uses the singular
 * after numbers ending in 1, except 11.
 */
export function minutesLabel(minutes: number): string {
  const singular = minutes % 10 === 1 && minutes % 100 !== 11;
  return `${minutes} ${singular ? "minut" : "minuta"}`;
}

export interface PluralForms {
  /** 1, 21, 31… (not 11). */
  one: string;
  /** 2–4, 22–24… (not 12–14). */
  few: string;
  /** Everything else. */
  other: string;
}

const pluralRules = new Intl.PluralRules("sr-Latn");

/** Picks the Serbian plural form for `count` and fills `{count}`. */
export function pluralize(forms: PluralForms, count: number): string {
  const category = pluralRules.select(count);
  const form =
    category === "one" || category === "few" ? forms[category] : forms.other;
  return format(form, { count });
}
