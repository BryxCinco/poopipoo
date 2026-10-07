"use client";

import { useContext } from "react";

import { I18nContext, type I18nContextValue } from "@/components/i18n/I18nProvider";

/** Current language, its dictionary (`t`) and `setLocale`. Must be inside <I18nProvider>. */
export function useI18n(): I18nContextValue {
  const value = useContext(I18nContext);
  if (!value) throw new Error("useI18n() must be used inside <I18nProvider>.");
  return value;
}
