"use client";

import { forwardRef } from "react";
import { motion, type HTMLMotionProps } from "framer-motion";

import { hoverLift, SPRING } from "@/lib/animations";
import { cn } from "@/lib/utils";

/**
 * Card with hover lift, border highlight and a shadow transition.
 * `interactive` adds a press animation (for cards that are links/buttons;
 * put the <Link>/<button> inside so keyboard focus and semantics stay native).
 */
export interface AnimatedCardProps extends HTMLMotionProps<"div"> {
  interactive?: boolean;
}

export const AnimatedCard = forwardRef<HTMLDivElement, AnimatedCardProps>(
  ({ interactive = false, className, ...props }, ref) => (
    <motion.div
      ref={ref}
      className={cn(
        "rounded-xl border bg-card text-card-foreground shadow-sm transition-[border-color,box-shadow] duration-200",
        "hover:border-primary/40 hover:shadow-md",
        // Keyboard users get the same highlight when a link inside is focused
        "focus-within:border-primary/40 focus-within:shadow-md",
        className
      )}
      whileHover={hoverLift}
      whileTap={interactive ? { scale: 0.99 } : undefined}
      transition={SPRING}
      {...props}
    />
  )
);
AnimatedCard.displayName = "AnimatedCard";
