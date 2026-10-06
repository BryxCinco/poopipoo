"use client";

import { motion } from "framer-motion";

import { DURATION, EASE_OUT } from "@/lib/animations";

/**
 * A check mark that "draws" itself (stroke animates from 0 to full length).
 * Same shape as Lucide's Check icon. Decorative: aria-hidden.
 */
export function AnimatedCheck({ className, strokeWidth = 2.5 }: { className?: string; strokeWidth?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <motion.path
        d="M20 6 9 17l-5-5"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: DURATION.slow, ease: EASE_OUT }}
      />
    </svg>
  );
}
