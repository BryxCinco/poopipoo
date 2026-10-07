"use client";

import { useI18n } from "@/hooks/use-i18n";

/**
 * Inline translated text for places that aren't worth a hook call, e.g. the
 * shadcn primitives' screen-reader "Close" labels. Pass a function that picks
 * the string: <T get={(t) => t.common.close} />
 */
export function T({ get }: { get: (t: ReturnType<typeof useI18n>["t"]) => string }) {
  const { t } = useI18n();
  return <>{get(t)}</>;
}
