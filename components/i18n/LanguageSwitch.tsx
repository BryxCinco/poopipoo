"use client";

import { motion } from "framer-motion";

import { useI18n } from "@/hooks/use-i18n";
import { SPRING } from "@/lib/animations";
import type { Locale } from "@/lib/i18n/config";
import { cn } from "@/lib/utils";

// Each language is written in its own language, so people can find theirs
const OPTIONS: { value: Locale; label: string }[] = [
  { value: "tl", label: "Tagalog" },
  { value: "en", label: "English" },
];

/**
 * Tagalog / English segmented control (a radio group for screen readers).
 * Switching updates the app right away and is remembered (cookie).
 */
export function LanguageSwitch({ labelledBy, className }: { labelledBy: string; className?: string }) {
  const { locale, setLocale } = useI18n();

  return (
    <div role="radiogroup" aria-labelledby={labelledBy} className={cn("grid grid-cols-2 gap-1 rounded-lg bg-muted p-1", className)}>
      {OPTIONS.map(({ value, label }) => {
        const selected = locale === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={selected}
            lang={value === "tl" ? "fil" : "en"}
            onClick={() => {
              if (!selected) setLocale(value);
            }}
            className={cn(
              "relative flex h-9 items-center justify-center rounded-md text-xs font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              selected ? "text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {selected && (
              <motion.span
                layoutId={`language-switch-${labelledBy}`}
                transition={SPRING}
                className="absolute inset-0 rounded-md bg-card shadow-sm"
                aria-hidden="true"
              />
            )}
            <span className="relative">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
