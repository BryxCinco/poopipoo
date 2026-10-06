"use client";

import type { ReactNode } from "react";
import { MotionConfig } from "framer-motion";

import { TooltipProvider } from "@/components/ui/tooltip";

/**
 * App-wide client providers.
 * - MotionConfig reducedMotion="user": when the OS asks for reduced motion,
 *   Framer Motion skips transform/layout animations (opacity fades remain).
 * - TooltipProvider: one shared delay for all tooltips.
 */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <TooltipProvider delayDuration={400}>{children}</TooltipProvider>
    </MotionConfig>
  );
}
