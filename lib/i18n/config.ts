/**
 * Languages: Tagalog ("tl") and English ("en").
 *
 * The choice is saved in a cookie so Server Components render in the right
 * language on the first paint (no flash). Without the cookie (first visit),
 * the browser's Accept-Language decides: English if the browser prefers
 * English, otherwise Tagalog.
 */

export const LOCALES = ["tl", "en"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "tl";
export const LOCALE_COOKIE = "poopipoo-locale";
/** One year, in seconds */
export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export function isLocale(value: unknown): value is Locale {
  return value === "tl" || value === "en";
}

/** <html lang>: "fil" is the standard code for Filipino/Tagalog content. */
export const HTML_LANG: Record<Locale, string> = { tl: "fil", en: "en" };

/** BCP 47 tag for Intl formatting and speech. */
export const INTL_LOCALE: Record<Locale, string> = { tl: "fil-PH", en: "en-PH" };

/** Open Graph locale */
export const OG_LOCALE: Record<Locale, string> = { tl: "fil_PH", en: "en_PH" };

/**
 * Picks a locale from an Accept-Language header, e.g. "en-US,en;q=0.9,fil;q=0.8".
 * The highest-ranked language we support wins; Tagalog when none match.
 */
export function detectLocale(acceptLanguage: string | null | undefined): Locale {
  if (!acceptLanguage) return DEFAULT_LOCALE;
  const ranked = acceptLanguage
    .split(",")
    .map((part, index) => {
      const [tag, ...params] = part.trim().toLowerCase().split(";");
      const q = params.map((p) => p.trim()).find((p) => p.startsWith("q="));
      const quality = q ? Number(q.slice(2)) : 1;
      return { lang: tag.split("-")[0], quality: Number.isFinite(quality) ? quality : 0, index };
    })
    // Higher quality first; ties keep the header order
    .sort((a, b) => b.quality - a.quality || a.index - b.index);

  for (const { lang } of ranked) {
    if (lang === "en") return "en";
    if (lang === "tl" || lang === "fil") return "tl";
  }
  return DEFAULT_LOCALE;
}
