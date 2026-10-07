import { cache } from "react";
import { cookies, headers } from "next/headers";

import { detectLocale, isLocale, LOCALE_COOKIE, type Locale } from "@/lib/i18n/config";
import { getDictionary, type Dictionary } from "@/lib/i18n/dictionaries";

/**
 * Server only. The visitor's language: the saved cookie, else the browser's
 * Accept-Language. Cached per request.
 */
export const getLocale = cache((): Locale => {
  const saved = cookies().get(LOCALE_COOKIE)?.value;
  if (isLocale(saved)) return saved;
  return detectLocale(headers().get("accept-language"));
});

/** Dictionary for the current request's language. */
export function getT(): Dictionary {
  return getDictionary(getLocale());
}
