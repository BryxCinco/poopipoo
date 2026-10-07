"use client";

import { createContext, useCallback, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import { HTML_LANG, LOCALE_COOKIE, LOCALE_COOKIE_MAX_AGE, type Locale } from "@/lib/i18n/config";
import { getDictionary, type Dictionary } from "@/lib/i18n/dictionaries";

export interface I18nContextValue {
  locale: Locale;
  t: Dictionary;
  /** Saves the choice (cookie), updates the page right away and re-renders server content. */
  setLocale: (locale: Locale) => void;
}

export const I18nContext = createContext<I18nContextValue | null>(null);

/**
 * Gives Client Components the current language. `initialLocale` comes from
 * the server (cookie / Accept-Language), so the first render matches the
 * server HTML.
 */
export function I18nProvider({ initialLocale, children }: { initialLocale: Locale; children: ReactNode }) {
  const router = useRouter();
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  const setLocale = useCallback(
    (next: Locale) => {
      document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=${LOCALE_COOKIE_MAX_AGE}; samesite=lax`;
      document.documentElement.lang = HTML_LANG[next];
      setLocaleState(next);
      // Server Components (page titles, server-rendered text) re-render in the new language
      router.refresh();
    },
    [router]
  );

  const value = useMemo<I18nContextValue>(
    () => ({ locale, t: getDictionary(locale), setLocale }),
    [locale, setLocale]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
