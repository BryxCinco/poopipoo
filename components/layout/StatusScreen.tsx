"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";

import { DURATION, EASE_OUT, SPRING } from "@/lib/animations";
import { cn } from "@/lib/utils";

/**
 * Full-page status screen for 404 and errors: a big faded code ("404") with
 * an icon dropping onto it, then the message and call-to-action buttons.
 * Every animation is one-shot and 300ms or less (reduced motion: fades only).
 */
interface StatusScreenProps {
  /** Big background text, e.g. "404" or "Oops" */
  code: string;
  /** An icon element, e.g. <MapPinOff /> */
  icon: ReactNode;
  title: string;
  description: string;
  actions: ReactNode;
  tone?: "default" | "error";
}

export function StatusScreen({ code, icon, title, description, actions, tone = "default" }: StatusScreenProps) {
  const error = tone === "error";

  return (
    <div
      role={error ? "alert" : undefined}
      className="mx-auto flex w-full max-w-screen-md flex-1 flex-col items-center justify-center gap-5 px-4 py-10 text-center"
    >
      <div className="relative flex h-40 w-full items-center justify-center" aria-hidden="true">
        {/* Big faded code behind the icon */}
        <motion.span
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: DURATION.slow, ease: EASE_OUT }}
          className={cn(
            "select-none bg-gradient-to-b bg-clip-text text-[7.5rem] font-black leading-none tracking-tighter text-transparent",
            error ? "from-destructive/25 to-destructive/5" : "from-primary/25 to-primary/5"
          )}
        >
          {code}
        </motion.span>
        {/* Icon drops in, then wiggles once */}
        <motion.span
          initial={{ y: -40, opacity: 0, rotate: 0 }}
          animate={{ y: 0, opacity: 1, rotate: [0, -12, 10, 0] }}
          transition={{
            y: SPRING,
            opacity: { duration: DURATION.base },
            rotate: { duration: DURATION.slow, delay: DURATION.slow, ease: EASE_OUT },
          }}
          className={cn(
            "absolute flex h-16 w-16 items-center justify-center rounded-2xl shadow-lg ring-8 [&_svg]:h-8 [&_svg]:w-8",
            error
              ? "bg-destructive text-destructive-foreground ring-destructive/10"
              : "bg-primary text-primary-foreground ring-primary/10"
          )}
        >
          {icon}
        </motion.span>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: DURATION.slow, ease: EASE_OUT, delay: 0.1 }}
        className="flex flex-col items-center gap-2"
      >
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="max-w-xs text-sm text-muted-foreground">{description}</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: DURATION.slow, ease: EASE_OUT, delay: 0.2 }}
        className="flex w-full max-w-xs flex-col gap-2 sm:w-auto sm:max-w-none sm:flex-row"
      >
        {actions}
      </motion.div>
    </div>
  );
}
