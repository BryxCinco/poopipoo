"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Ban, Hourglass, Map as MapIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useI18n } from "@/hooks/use-i18n";
import { INTL_LOCALE } from "@/lib/i18n/config";
import { format } from "@/lib/i18n/format";
import { formatAbsoluteDate } from "@/lib/relative-time";
import { cn } from "@/lib/utils";

/** "1:04:09" or "4:09" — language-neutral countdown. */
function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${minutes}:${pad(seconds)}`;
}

/** Milliseconds until `retryAt`, ticking every second. null before mount (no hydration mismatch). */
function useRemaining(retryAt: string): number | null {
  const [remaining, setRemaining] = useState<number | null>(null);
  useEffect(() => {
    const target = new Date(retryAt).getTime();
    const tick = () => setRemaining(Math.max(0, target - Date.now()));
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [retryAt]);
  return remaining;
}

interface RateLimitNoticeProps {
  /** ISO time when adding is allowed again */
  retryAt: string;
  /** Called once when the countdown reaches zero */
  onReady?: () => void;
  /** "page" = replaces the add form, "inline" = banner inside the form */
  variant?: "page" | "inline";
}

/**
 * Restroom rate limit: why, and a live countdown to when adding works again.
 * On the /add page it refreshes the page at zero so the form appears.
 */
export function RateLimitNotice({ retryAt, onReady, variant = "page" }: RateLimitNoticeProps) {
  const { t, locale } = useI18n();
  const tl = t.moderation.rateLimit;
  const router = useRouter();
  const remaining = useRemaining(retryAt);
  const ready = remaining === 0;

  useEffect(() => {
    if (!ready) return;
    if (onReady) onReady();
    else router.refresh();
  }, [ready, onReady, router]);

  const date = new Date(retryAt);
  const moreThanADay = date.getTime() - Date.now() > 20 * 60 * 60 * 1000;
  const clock = new Intl.DateTimeFormat(INTL_LOCALE[locale], {
    ...(moreThanADay ? { weekday: "short" } : {}),
    hour: "numeric",
    minute: "2-digit",
  }).format(date);

  const countdown = (
    <p className="flex flex-col items-center gap-0.5" role="timer" aria-live="off">
      <span className="text-xs text-muted-foreground">{ready ? tl.ready : tl.countdownLabel}</span>
      {!ready && (
        <span className="font-mono text-3xl font-bold tabular-nums" suppressHydrationWarning>
          {remaining === null ? "--:--" : formatCountdown(remaining)}
        </span>
      )}
      {!ready && (
        <span className="text-xs text-muted-foreground" suppressHydrationWarning>
          {format(tl.at, { time: clock })}
        </span>
      )}
    </p>
  );

  if (variant === "inline") {
    return (
      <div role="status" className="flex flex-col items-center gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-center">
        <p className="flex items-center gap-2 text-sm font-semibold">
          <Hourglass className="h-4 w-4" aria-hidden="true" />
          {tl.title}
        </p>
        {countdown}
      </div>
    );
  }

  return (
    <NoticeCard icon={<Hourglass />} title={tl.title} description={tl.description}>
      {countdown}
      <Button asChild variant="outline" className="w-full">
        <Link href="/">
          <MapIcon aria-hidden="true" />
          {tl.backToMap}
        </Link>
      </Button>
    </NoticeCard>
  );
}

/** Shown instead of forms when the account is banned. */
export function BannedNotice({
  reason,
  bannedAt,
  headingLevel = "h1",
  className,
}: {
  reason: string | null;
  bannedAt: string | null;
  /** "h2" when the page already has its own h1 (profile) */
  headingLevel?: "h1" | "h2";
  className?: string;
}) {
  const { t, locale } = useI18n();
  const tb = t.moderation.banned;
  return (
    <NoticeCard icon={<Ban />} title={tb.title} description={tb.description} tone="error" headingLevel={headingLevel} className={className}>
      <p className="text-sm font-medium">{format(tb.reason, { reason: reason || t.errors.noReason })}</p>
      {bannedAt && (
        <p className="text-xs text-muted-foreground">{format(tb.since, { date: formatAbsoluteDate(bannedAt, locale) })}</p>
      )}
    </NoticeCard>
  );
}

function NoticeCard({
  icon,
  title,
  description,
  children,
  tone = "default",
  headingLevel = "h1",
  className,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  children?: ReactNode;
  tone?: "default" | "error";
  headingLevel?: "h1" | "h2";
  className?: string;
}) {
  const error = tone === "error";
  const Heading = headingLevel;
  return (
    <section
      role={error ? "alert" : "status"}
      className={cn(
        "mx-auto flex w-full max-w-sm flex-col items-center gap-3 rounded-2xl border bg-card p-6 text-center shadow-sm",
        error && "border-destructive/40",
        className
      )}
    >
      <span
        className={cn(
          "flex h-12 w-12 items-center justify-center rounded-full [&_svg]:h-6 [&_svg]:w-6",
          error ? "bg-destructive/10 text-destructive" : "bg-amber-500/15 text-amber-700 dark:text-amber-300"
        )}
        aria-hidden="true"
      >
        {icon}
      </span>
      <Heading className="text-lg font-semibold">{title}</Heading>
      <p className="text-sm text-muted-foreground">{description}</p>
      {children}
    </section>
  );
}
