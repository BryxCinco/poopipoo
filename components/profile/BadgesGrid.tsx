"use client";

import { motion } from "framer-motion";
import { Lock } from "lucide-react";

import { BADGES, isEarned, type BadgeStats } from "@/lib/badges";
import { staggerContainer, staggerItem } from "@/lib/animations";
import { cn } from "@/lib/utils";

interface BadgesGridProps {
  /** Saved badge ids (profiles.badges) */
  badges: readonly string[];
  stats: BadgeStats;
}

/** All badges: unlocked ones in color, locked ones greyed out with progress ("2/5"). */
export function BadgesGrid({ badges, stats }: BadgesGridProps) {
  const owned = new Set(badges);
  const unlockedCount = BADGES.filter((badge) => owned.has(badge.id) || isEarned(badge, stats)).length;

  return (
    <section className="flex flex-col gap-2" aria-labelledby="badges-heading">
      <h2 id="badges-heading" className="flex items-baseline justify-between font-semibold">
        Badges
        <span className="text-xs font-normal text-muted-foreground">
          {unlockedCount} / {BADGES.length} na-unlock
        </span>
      </h2>
      <motion.ul
        className="grid grid-cols-3 gap-2"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        {BADGES.map((badge) => {
          const unlocked = owned.has(badge.id) || isEarned(badge, stats);
          const [current, goal] = badge.progress(stats);
          const Icon = badge.icon;
          return (
            <motion.li
              key={badge.id}
              variants={staggerItem}
              className={cn(
                "flex flex-col items-center gap-1.5 rounded-xl border p-3 text-center",
                unlocked ? "border-primary/30 bg-primary/5 shadow-sm" : "bg-muted/40"
              )}
            >
              <span
                className={cn(
                  "relative flex h-11 w-11 items-center justify-center rounded-full",
                  unlocked ? "bg-primary text-primary-foreground shadow-md" : "bg-muted text-muted-foreground/60"
                )}
              >
                <Icon className="h-5 w-5" aria-hidden="true" />
                {!unlocked && (
                  <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border bg-card">
                    <Lock className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
                  </span>
                )}
              </span>
              <span className={cn("text-xs font-semibold leading-tight", !unlocked && "text-muted-foreground")}>
                {badge.name}
              </span>
              <span className="text-[10px] leading-tight text-muted-foreground">{badge.description}</span>
              <span className="sr-only">{unlocked ? "Na-unlock" : "Naka-lock"}</span>
              {!unlocked && (
                <span className="text-[10px] font-medium tabular-nums text-muted-foreground" aria-label={`Progress: ${Math.min(current, goal)} ng ${goal}`}>
                  {Math.min(current, goal)}/{goal}
                </span>
              )}
            </motion.li>
          );
        })}
      </motion.ul>
    </section>
  );
}
