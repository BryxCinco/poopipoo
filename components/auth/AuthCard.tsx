"use client";

import { motion } from "framer-motion";
import { Toilet } from "lucide-react";

import { scaleIn, slideUp, SPRING } from "@/lib/animations";

/** Shared frame for the login and signup pages. */
export function AuthCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      variants={slideUp}
      initial="hidden"
      animate="visible"
      className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-4 py-8"
    >
      <div className="flex flex-col items-center gap-2 text-center">
        <motion.span
          variants={scaleIn}
          initial="hidden"
          animate="visible"
          transition={SPRING}
          className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground shadow-lg"
        >
          <Toilet className="h-7 w-7" aria-hidden="true" />
        </motion.span>
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>
      <div className="rounded-2xl border bg-card p-5 shadow-sm">{children}</div>
    </motion.div>
  );
}
