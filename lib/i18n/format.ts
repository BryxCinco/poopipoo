/**
 * Tiny helpers for dictionary strings.
 *
 * format("Salamat, {name}!", { name: "Ana" }) → "Salamat, Ana!"
 * plural({ one: "{count} review", other: "{count} reviews" }, 3) → "3 reviews"
 */

export type Vars = Record<string, string | number>;

export function format(template: string, vars: Vars = {}): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in vars ? String(vars[key]) : match
  );
}

export interface PluralForms {
  one: string;
  other: string;
}

/** Picks the singular/plural form and fills in {count} (plus any other vars). */
export function plural(forms: PluralForms, count: number, vars: Vars = {}): string {
  return format(count === 1 ? forms.one : forms.other, { count, ...vars });
}
