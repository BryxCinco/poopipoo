"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Medal, Plus, Trophy } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/EmptyState";
import { staggerItemCapped } from "@/lib/animations";
import { useI18n } from "@/hooks/use-i18n";
import { format } from "@/lib/i18n/format";
import { getLevelDef } from "@/lib/levels";
import { cn } from "@/lib/utils";

export interface LeaderboardEntry {
  id: string;
  username: string;
  avatarUrl: string | null;
  points: number;
  level: number;
  /** 1-based; tied points share a rank */
  rank: number;
}

interface LeaderboardProps {
  entries: LeaderboardEntry[];
  currentUserId: string | null;
  /** The viewer's own entry when they're not in the list (else null) */
  me: LeaderboardEntry | null;
}

// Gold, silver, bronze for ranks 1–3
// label = key in t.leaderboard
const PODIUM: Record<number, { label: "gold" | "silver" | "bronze"; row: string; medal: string }> = {
  1: {
    label: "gold",
    row: "border-amber-400/60 bg-amber-50 dark:bg-amber-400/10",
    medal: "bg-amber-400 text-amber-950",
  },
  2: {
    label: "silver",
    row: "border-slate-300 bg-slate-50 dark:border-slate-400/40 dark:bg-slate-400/10",
    medal: "bg-slate-300 text-slate-900",
  },
  3: {
    label: "bronze",
    row: "border-orange-300/70 bg-orange-50 dark:border-orange-400/40 dark:bg-orange-400/10",
    medal: "bg-orange-400 text-orange-950",
  },
};

function Row({ entry, isMe }: { entry: LeaderboardEntry; isMe: boolean }) {
  const podium = PODIUM[entry.rank];
  const level = getLevelDef(entry.level);
  const { t } = useI18n();
  const medal = podium ? t.leaderboard[podium.label] : "";

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-xl border bg-card p-3 shadow-sm",
        podium?.row,
        isMe && "ring-2 ring-primary ring-offset-2 ring-offset-background"
      )}
    >
      {/* Rank: a medal for the top 3, else the number */}
      <div className="flex w-9 shrink-0 justify-center">
        {podium ? (
          <span
            className={cn("flex h-8 w-8 items-center justify-center rounded-full shadow-sm", podium.medal)}
            title={medal}
          >
            <Medal className="h-4 w-4" aria-hidden="true" />
            <span className="sr-only">{medal}</span>
          </span>
        ) : null}
        <span className={cn("text-sm font-bold tabular-nums text-muted-foreground", podium && "sr-only")}>
          #{entry.rank}
        </span>
      </div>

      <Avatar className="h-10 w-10 shrink-0">
        {entry.avatarUrl && <AvatarImage src={entry.avatarUrl} alt="" />}
        <AvatarFallback className="bg-primary/10 font-semibold uppercase text-primary">
          {entry.username.slice(0, 1)}
        </AvatarFallback>
      </Avatar>

      <div className="flex min-w-0 flex-1 flex-col">
        <span className="flex items-center gap-1.5 truncate font-semibold">
          <span className="truncate">{entry.username}</span>
          {isMe && (
            <span className="shrink-0 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold leading-none text-primary-foreground">
              {t.leaderboard.you}
            </span>
          )}
        </span>
        <span className="text-xs text-muted-foreground">
          {format(t.level.short, { level: entry.level, name: level.name })}
        </span>
      </div>

      <div className="flex shrink-0 flex-col items-end">
        <span className="text-lg font-bold tabular-nums leading-tight">{entry.points.toLocaleString("en-PH")}</span>
        <span className="text-[11px] text-muted-foreground">{t.common.points}</span>
      </div>
    </div>
  );
}

export function Leaderboard({ entries, currentUserId, me }: LeaderboardProps) {
  const { t } = useI18n();
  if (entries.length === 0) {
    return (
      <EmptyState
        icon={<Trophy />}
        title={t.leaderboard.emptyTitle}
        description={t.leaderboard.emptyDescription}
        action={
          <Button asChild>
            <Link href="/add">
              <Plus aria-hidden="true" />
              {t.profile.addRestroom}
            </Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <ol className="flex flex-col gap-2" aria-label={t.leaderboard.rankingLabel}>
        {entries.map((entry, index) => (
          <motion.li key={entry.id} custom={index} variants={staggerItemCapped} initial="hidden" animate="visible">
            <Row entry={entry} isMe={entry.id === currentUserId} />
          </motion.li>
        ))}
      </ol>

      {me && (
        <section aria-label={t.leaderboard.yourRank} className="flex flex-col gap-2 border-t pt-3">
          <p className="text-xs font-medium text-muted-foreground">{t.leaderboard.yourRank}</p>
          <Row entry={me} isMe />
        </section>
      )}
    </div>
  );
}
