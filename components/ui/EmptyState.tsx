"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";

import { DURATION, EASE_OUT, slideUp, SPRING } from "@/lib/animations";
import { cn } from "@/lib/utils";

/**
 * Empty / error state: a small "illustration" (icon inside soft concentric
 * circles) that pops in with one gentle wiggle, then heading, description and
 * an optional call to action.
 */
interface EmptyStateProps {
  /**
   * An icon element, e.g. <Toilet /> (an element, not the component, so Server
   * Components like not-found.tsx can pass it). Sized here; no props needed.
   */
  icon: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  tone?: "default" | "error";
  /** "alert" for errors so screen readers announce them */
  role?: "alert" | "status";
  compact?: boolean;
  /** Use "h1" when the empty/error state is the whole page */
  titleAs?: "p" | "h1" | "h2";
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  tone = "default",
  role,
  compact = false,
  titleAs: Title = "p",
  className,
}: EmptyStateProps) {
  const error = tone === "error";

  return (
    <motion.div
      variants={slideUp}
      initial="hidden"
      animate="visible"
      role={role}
      className={cn("flex flex-col items-center gap-2 text-center", compact ? "py-6" : "py-12", className)}
    >
      {/* Illustration: concentric circles behind the icon */}
      <div className="relative mb-2 flex items-center justify-center" aria-hidden="true">
        <span
          className={cn(
            "absolute rounded-full",
            compact ? "h-20 w-20" : "h-28 w-28",
            error ? "bg-destructive/5" : "bg-primary/5"
          )}
        />
        <span
          className={cn(
            "absolute rounded-full",
            compact ? "h-14 w-14" : "h-20 w-20",
            error ? "bg-destructive/10" : "bg-primary/10"
          )}
        />
        <motion.span
          initial={{ scale: 0.6, opacity: 0, rotate: 0 }}
          animate={{ scale: 1, opacity: 1, rotate: [0, -10, 8, 0] }}
          transition={{
            scale: SPRING,
            opacity: { duration: DURATION.base },
            rotate: { duration: DURATION.slow, delay: DURATION.base, ease: EASE_OUT },
          }}
          className={cn(
            "relative flex items-center justify-center rounded-full shadow-sm",
            compact ? "h-10 w-10 [&_svg]:h-5 [&_svg]:w-5" : "h-14 w-14 [&_svg]:h-7 [&_svg]:w-7",
            error ? "bg-destructive text-destructive-foreground" : "bg-primary text-primary-foreground"
          )}
        >
          {icon}
        </motion.span>
      </div>

      <Title className={cn("font-semibold text-foreground", !compact && "text-xl font-bold")}>{title}</Title>
      {description && <p className="max-w-xs text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </motion.div>
  );
}
