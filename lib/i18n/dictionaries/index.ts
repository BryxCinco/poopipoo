import type { Locale } from "@/lib/i18n/config";
import { en } from "@/lib/i18n/dictionaries/en";
import { tl } from "@/lib/i18n/dictionaries/tl";

/** Shape of every dictionary, taken from the Tagalog one. */
export type Dictionary = typeof tl;

const DICTIONARIES: Record<Locale, Dictionary> = { tl, en };

/** Both dictionaries are small, so they're bundled; switching language needs no request. */
export function getDictionary(locale: Locale): Dictionary {
  return DICTIONARIES[locale];
}
