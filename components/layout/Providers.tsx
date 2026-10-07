"use client";

import type { ReactNode } from "react";
import { MotionConfig } from "framer-motion";

import { I18nProvider } from "@/components/i18n/I18nProvider";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { Locale } from "@/lib/i18n/config";

/**
 * App-wide client providers.
 * - MotionConfig reducedMotion="user": when the OS asks for reduced motion,
 *   Framer Motion skips transform/layout animations (opacity fades remain).
 * - TooltipProvider: one shared delay for all tooltips.
 * - I18nProvider: the UI language (Tagalog / English) for Client Components.
 */
export function Providers({ locale, children }: { locale: Locale; children: ReactNode }) {
  return (
    <I18nProvider initialLocale={locale}>
      <MotionConfig reducedMotion="user">
        <TooltipProvider delayDuration={400}>{children}</TooltipProvider>
      </MotionConfig>
    </I18nProvider>
  );
}
