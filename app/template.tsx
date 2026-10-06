"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";

import { DURATION, EASE_OUT } from "@/lib/animations";

/**
 * Page transition. Next.js re-mounts template.tsx on every navigation (unlike
 * layout.tsx), so each page fades in.
 *
 * Enter-only on purpose: App Router unmounts the old page immediately, so a
 * fade-out (AnimatePresence exit) would need Next.js internals.
 * Opacity only — a transform here would break `position: fixed` children
 * (e.g. the navigation panel) while animating.
 */
export default function Template({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: DURATION.base, ease: EASE_OUT }}
      className="flex min-h-0 w-full flex-1 flex-col"
    >
      {children}
    </motion.div>
  );
}
