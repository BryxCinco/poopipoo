"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ChevronRight, Star, Trophy } from "lucide-react";

import { CountUp } from "@/components/ui/CountUp";
import { DURATION, EASE_OUT } from "@/lib/animations";
import { useI18n } from "@/hooks/use-i18n";
import { format } from "@/lib/i18n/format";
import { getLevelProgress, MAX_LEVEL } from "@/lib/levels";

/** Profile header card: level, points, progress to the next level, link to the leaderboard. */
export function LevelCard({ points }: { points: number }) {
  const { current, next, ratio, pointsToNext } = getLevelProgress(points);
  const percent = Math.round(ratio * 100);
  const { t } = useI18n();

  return (
    <section
      aria-label={t.level.cardLabel}
      className="flex flex-col gap-3 overflow-hidden rounded-2xl border bg-gradient-to-br from-primary/10 via-card to-card p-4 shadow-sm"
    >
      <div className="flex items-center gap-3">
        <span className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md">
          <Star className="absolute h-12 w-12 opacity-20" aria-hidden="true" />
          <span className="relative text-xl font-bold">{current.level}</span>
        </span>
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {format(t.level.levelOf, { level: current.level, max: MAX_LEVEL })}
          </span>
          <span className="text-lg font-bold leading-tight">{current.name}</span>
        </div>
        <div className="flex shrink-0 flex-col items-end">
          <CountUp value={points} className="text-2xl font-bold tabular-nums leading-none" />
          <span className="text-[11px] text-muted-foreground">{t.common.points}</span>
        </div>
      </div>

      {/* Progress to the next level */}
      <div className="flex flex-col gap-1.5">
        <div
          role="progressbar"
          aria-label={next ? format(t.level.progressLabel, { level: next.level }) : t.level.maxLabel}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
          className="h-2.5 w-full overflow-hidden rounded-full bg-muted"
        >
          <motion.div
            className="h-full rounded-full bg-primary"
            initial={{ width: 0 }}
            animate={{ width: `${percent}%` }}
            transition={{ duration: DURATION.slow, ease: EASE_OUT, delay: 0.1 }}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          {next
            ? format(t.level.toNext, { points: pointsToNext, level: next.level, name: next.name })
            : t.level.maxReached}
        </p>
      </div>

      <Link
        href="/leaderboard"
        className="group -mx-1 flex items-center gap-2 rounded-lg px-1 py-1 text-sm font-medium text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Trophy className="h-4 w-4" aria-hidden="true" />
        <span className="flex-1">{t.level.viewLeaderboard}</span>
        <ChevronRight className="h-4 w-4 transition-transform duration-150 group-hover:translate-x-0.5" aria-hidden="true" />
      </Link>
    </section>
  );
}
