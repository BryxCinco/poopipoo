"use client";

import { motion } from "framer-motion";
import { Monitor, Moon, Sun, type LucideIcon } from "lucide-react";

import { useI18n } from "@/hooks/use-i18n";
import { useTheme } from "@/hooks/use-theme";
import { SPRING } from "@/lib/animations";
import type { ThemePreference } from "@/lib/theme";
import { cn } from "@/lib/utils";

// The value is also the label's key in t.theme
const OPTIONS: { value: ThemePreference; icon: LucideIcon }[] = [
  { value: "light", icon: Sun },
  { value: "dark", icon: Moon },
  { value: "system", icon: Monitor },
];

/**
 * Light / Dark / Auto picker (Auto follows the phone's setting).
 * Segmented control with a sliding highlight; a radio group for screen readers.
 */
export function ThemeSetting() {
  const { preference, setTheme } = useTheme();
  const { t } = useI18n();

  return (
    <div className="flex flex-col gap-2 px-3 py-3">
      <div className="flex items-center gap-3 text-sm">
        <Moon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        <span id="theme-label" className="flex-1">
          {t.theme.label}
        </span>
      </div>
      <div
        role="radiogroup"
        aria-labelledby="theme-label"
        className="grid grid-cols-3 gap-1 rounded-lg bg-muted p-1"
      >
        {OPTIONS.map(({ value, icon: Icon }) => {
          const selected = preference === value;
          return (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => setTheme(value)}
              className={cn(
                "relative flex h-9 items-center justify-center gap-1.5 rounded-md text-xs font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                selected ? "text-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {selected && (
                <motion.span
                  layoutId="theme-setting-active"
                  transition={SPRING}
                  className="absolute inset-0 rounded-md bg-card shadow-sm"
                  aria-hidden="true"
                />
              )}
              <Icon className="relative h-3.5 w-3.5" aria-hidden="true" />
              <span className="relative">{t.theme[value]}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
