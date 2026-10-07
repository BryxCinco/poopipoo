"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ChevronRight,
  Flag,
  Gavel,
  Info,
  LogIn,
  MapPin,
  MessageSquare,
  Pencil,
  Plus,
  Settings,
  ShieldCheck,
  ThumbsUp,
  Toilet,
  Trophy,
  User,
  UserPlus,
  type LucideIcon,
} from "lucide-react";

import { LogoutButton } from "@/components/auth/LogoutButton";
import { BannedNotice } from "@/components/moderation/Notices";
import { RestroomStatusBadge } from "@/components/moderation/RestroomStatusBadge";
import { VERIFICATIONS_NEEDED } from "@/components/moderation/VerifyButton";
import { BadgesGrid } from "@/components/profile/BadgesGrid";
import { LevelCard } from "@/components/profile/LevelCard";
import { DeleteRestroomButton } from "@/components/restroom/DeleteRestroomButton";
import { DeleteReviewButton } from "@/components/restroom/DeleteReviewButton";
import { LocalRestroomsUpload } from "@/components/restroom/LocalRestroomsUpload";
import { StarRating } from "@/components/restroom/StarRating";
import { AnimatedCard } from "@/components/ui/AnimatedCard";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { CountUp } from "@/components/ui/CountUp";
import { EmptyState } from "@/components/ui/EmptyState";
import { Separator } from "@/components/ui/separator";
import { useI18n } from "@/hooks/use-i18n";
import { useToast } from "@/hooks/use-toast";
import { SPRING, staggerContainer, staggerItem, staggerItemCapped } from "@/lib/animations";
import { loginUrl } from "@/lib/auth/return-url";
import { BADGES, type BadgeId, type BadgeStats } from "@/lib/badges";
import { errorText } from "@/lib/i18n/errors";
import { format } from "@/lib/i18n/format";
import { formatRelativeTime } from "@/lib/relative-time";
import { invalidateRestrooms } from "@/lib/restroom-store";
import { deleteReview } from "@/lib/reviews/queries";
import { createClient } from "@/lib/supabase/client";
import type { ReportReason, ReportStatus, ReportTargetType } from "@/types/database";
import type { Restroom } from "@/types/restroom";

export interface ProfileAccount {
  id: string;
  email: string;
  username: string;
  avatarUrl: string | null;
  points: number;
  /** Counts used for badges (and shown as stats) */
  stats: BadgeStats;
  /** Unlocked badge ids */
  badges: string[];
  /** Badges unlocked on this visit (a toast celebrates them) */
  newBadges: BadgeId[];
  /** Phase 11 */
  trustScore: number;
  isModerator: boolean;
  /** null = not banned */
  ban: { reason: string | null; at: string | null } | null;
}

export interface ProfileReport {
  id: string;
  targetType: ReportTargetType;
  /** null when the reported item was deleted or is hidden */
  target: { name: string; restroomId: string } | null;
  reason: ReportReason;
  status: ReportStatus;
  createdAt: string;
}

export interface ProfileReview {
  id: string;
  restroomId: string;
  /** null when the restroom was deleted */
  restroomName: string | null;
  rating: number;
  comment: string;
  createdAt: string;
}

interface ProfileViewProps {
  /** null for guests */
  account: ProfileAccount | null;
  restrooms: Restroom[];
  reviews: ProfileReview[];
  /** The user's own reports, newest first */
  reports: ProfileReport[];
}

type LinkKey = "leaderboard" | "settings" | "about" | "moderation";

// key = entry in t.profile.links
const LINKS: { href: string; key: LinkKey; icon: LucideIcon }[] = [
  { href: "/leaderboard", key: "leaderboard", icon: Trophy },
  { href: "/settings", key: "settings", icon: Settings },
  { href: "/about", key: "about", icon: Info },
];

// Only shown to moderators/admins (the page checks the role again)
const MODERATION_LINK: { href: string; key: LinkKey; icon: LucideIcon } = {
  href: "/moderation",
  key: "moderation",
  icon: Gavel,
};

export function ProfileView({ account, restrooms, reviews, reports }: ProfileViewProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { t, locale } = useI18n();
  // Restrooms hidden right away while their delete is in flight (optimistic UI)
  const [hiddenIds, setHiddenIds] = useState<ReadonlySet<string>>(new Set());

  const visibleRestrooms = restrooms.filter((restroom) => !hiddenIds.has(restroom.id));
  const visibleReviews = reviews.filter((review) => !hiddenIds.has(review.id));
  // "My submissions": restrooms not approved yet (pending, flagged or rejected)
  const submissions = visibleRestrooms.filter((restroom) => restroom.status && restroom.status !== "approved");
  const links = account?.isModerator ? [MODERATION_LINK, ...LINKS] : LINKS;
  const tm = t.moderation;

  const setHidden = (id: string, hidden: boolean) =>
    setHiddenIds((prev) => {
      const next = new Set(prev);
      if (hidden) next.add(id);
      else next.delete(id);
      return next;
    });

  const handleDeleteReview = async (review: ProfileReview) => {
    setHidden(review.id, true);
    try {
      await deleteReview(createClient(), review.id);
      toast({ title: t.profile.reviewDeleted, description: review.restroomName ?? t.profile.deletedRestroom });
      invalidateRestrooms(); // the restroom's rating changed
      router.refresh();
    } catch (error) {
      setHidden(review.id, false);
      toast({
        variant: "destructive",
        title: t.profile.reviewDeleteFailed,
        description: errorText(error, t),
      });
    }
  };

  // Celebrate badges unlocked on this visit (once per page load)
  const celebrated = useRef(false);
  const newBadges = account?.newBadges;
  useEffect(() => {
    if (celebrated.current || !newBadges || newBadges.length === 0) return;
    celebrated.current = true;
    const names = BADGES.filter((badge) => newBadges.includes(badge.id)).map((badge) => t.badges.items[badge.id].name);
    toast({ title: newBadges.length === 1 ? t.profile.newBadge : t.profile.newBadges, description: names.join(", ") });
  }, [newBadges, toast, t]);

  const stats: { label: string; value: number; icon: LucideIcon }[] = [
    { label: t.profile.statRestrooms, value: visibleRestrooms.length, icon: Toilet },
    { label: t.profile.statReviews, value: visibleReviews.length, icon: MessageSquare },
    { label: t.profile.statHelpful, value: account?.stats.helpfulVotesReceived ?? 0, icon: ThumbsUp },
  ];

  return (
    <div className="mx-auto flex w-full max-w-screen-md flex-col gap-6 px-4 py-5">
      {/* Identity */}
      <section className="flex items-center gap-4">
        <motion.div whileHover={{ scale: 1.06, rotate: -3 }} whileTap={{ scale: 0.96 }} transition={SPRING} className="rounded-full">
          <Avatar className="h-16 w-16 shadow-md ring-2 ring-primary/20 ring-offset-2 ring-offset-background transition-shadow hover:ring-primary/50">
            {account?.avatarUrl && <AvatarImage src={account.avatarUrl} alt="" />}
            <AvatarFallback className="bg-primary/10 text-primary">
              {account ? (
                <span className="text-xl font-semibold uppercase">{account.username.slice(0, 1)}</span>
              ) : (
                <User className="h-8 w-8" aria-hidden="true" />
              )}
            </AvatarFallback>
          </Avatar>
        </motion.div>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-bold">{account ? account.username : t.profile.guest}</h1>
          <p className="truncate text-sm text-muted-foreground">
            {account ? account.email : t.profile.notLoggedIn}
          </p>
        </div>
      </section>

      {/* Restrooms saved on this device before accounts existed */}
      <LocalRestroomsUpload userId={account?.id ?? null} returnUrl="/profile" />

      {!account ? (
        <GuestPrompt />
      ) : (
        <>
          {account.ban && <BannedNotice reason={account.ban.reason} bannedAt={account.ban.at} headingLevel="h2" />}

          <LevelCard points={account.points} />

          {/* Trust score (Phase 11): grows when the community confirms your restrooms */}
          <section
            aria-labelledby="trust-heading"
            className="flex items-center gap-3 rounded-xl border bg-card p-3 shadow-sm"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <ShieldCheck className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="flex min-w-0 flex-1 flex-col">
              <h2 id="trust-heading" className="text-sm font-semibold">
                {tm.profile.trustScore}
              </h2>
              <p className="text-xs text-muted-foreground">{tm.profile.trustHint}</p>
            </div>
            <CountUp value={account.trustScore} className="text-2xl font-bold tabular-nums" />
          </section>

          {/* Stats */}
          <motion.section
            aria-label={t.profile.statsLabel}
            className="grid grid-cols-3 gap-2"
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
          >
            {stats.map(({ label, value, icon: Icon }) => (
              <motion.div
                key={label}
                variants={staggerItem}
                className="flex flex-col items-center gap-1 rounded-xl border bg-card p-3 text-center shadow-sm"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <CountUp value={value} className="text-2xl font-bold tabular-nums leading-none" />
                <span className="text-[11px] leading-tight text-muted-foreground">{label}</span>
              </motion.div>
            ))}
          </motion.section>

          <BadgesGrid badges={account.badges} stats={account.stats} />

          {/* Restrooms waiting for verification / under review / rejected */}
          {submissions.length > 0 && (
            <section className="flex flex-col gap-2" aria-labelledby="submissions-heading">
              <div>
                <h2 id="submissions-heading" className="font-semibold">
                  {tm.profile.mySubmissions}
                </h2>
                <p className="text-xs text-muted-foreground">{tm.profile.submissionsHint}</p>
              </div>
              <ul className="flex flex-col gap-2">
                {submissions.map((restroom) => (
                  <li key={restroom.id}>
                    <Link
                      href={"/restroom/" + restroom.id}
                      className="flex flex-col gap-1.5 rounded-xl border bg-card p-3 shadow-sm transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <span className="flex items-start justify-between gap-2">
                        <span className="truncate font-medium">{restroom.name}</span>
                        {restroom.status && <RestroomStatusBadge status={restroom.status} className="shrink-0" />}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {restroom.status === "rejected"
                          ? tm.statusHint.rejected
                          : format(tm.profile.confirmations, {
                              count: restroom.verifiedCount ?? 0,
                              needed: VERIFICATIONS_NEEDED,
                            })}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* User's restrooms */}
          <section className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">{t.profile.myRestrooms}</h2>
              {visibleRestrooms.length > 0 && (
                <Button asChild variant="ghost" size="sm" className="h-8 px-2">
                  <Link href="/add">
                    <Plus aria-hidden="true" />
                    {t.profile.add}
                  </Link>
                </Button>
              )}
            </div>

            {visibleRestrooms.length === 0 ? (
              <div className="rounded-xl border border-dashed">
                <EmptyState
                  compact
                  icon={<Toilet />}
                  title={t.profile.noRestroomsTitle}
                  description={t.profile.noRestroomsDescription}
                  action={
                    <Button asChild>
                      <Link href="/add">
                        <Plus aria-hidden="true" />
                        {t.profile.addRestroom}
                      </Link>
                    </Button>
                  }
                />
              </div>
            ) : (
              <ul className="flex flex-col gap-2">
                {visibleRestrooms.map((restroom, index) => (
                  <motion.li key={restroom.id} custom={index} variants={staggerItemCapped} initial="hidden" animate="visible">
                    <AnimatedCard className="flex items-center gap-1 p-1 pl-3">
                      <Link
                        href={`/restroom/${restroom.id}`}
                        className="flex min-w-0 flex-1 flex-col rounded-lg py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <span className="truncate font-medium">{restroom.name}</span>
                        <span className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3 shrink-0" aria-hidden="true" />
                          <span className="truncate">{restroom.address}</span>
                        </span>
                      </Link>
                      <DeleteRestroomButton
                        restroom={restroom}
                        onDeleteStart={() => setHidden(restroom.id, true)}
                        onDeleteError={() => setHidden(restroom.id, false)}
                        onDeleted={() => router.refresh()}
                      />
                    </AnimatedCard>
                  </motion.li>
                ))}
              </ul>
            )}
          </section>

          {/* User's reviews (writing reviews comes in Phase 6) */}
          <section className="flex flex-col gap-2">
            <h2 className="font-semibold">{t.profile.myReviews}</h2>
            {visibleReviews.length === 0 ? (
              <div className="rounded-xl border border-dashed">
                <EmptyState
                  compact
                  icon={<MessageSquare />}
                  title={t.profile.noReviewsTitle}
                  description={t.profile.noReviewsDescription}
                  action={
                    <Button asChild variant="outline" size="sm">
                      <Link href="/list">{t.profile.findRestroom}</Link>
                    </Button>
                  }
                />
              </div>
            ) : (
              <ul className="flex flex-col gap-2">
                {visibleReviews.map((review, index) => (
                  <motion.li
                    key={review.id}
                    custom={index}
                    variants={staggerItemCapped}
                    initial="hidden"
                    animate="visible"
                    className="flex flex-col gap-1 rounded-xl border bg-card p-3 shadow-sm"
                  >
                    <Link
                      href={`/restroom/${review.restroomId}`}
                      className="group flex items-baseline justify-between gap-2 rounded-sm"
                    >
                      <span className="link-underline truncate font-medium">{review.restroomName ?? t.profile.deletedRestroom}</span>
                      <time
                        dateTime={review.createdAt}
                        className="shrink-0 text-xs text-muted-foreground"
                        suppressHydrationWarning
                      >
                        {formatRelativeTime(review.createdAt, locale)}
                      </time>
                    </Link>
                    <StarRating rating={review.rating} />
                    {review.comment && (
                      <p className="line-clamp-3 whitespace-pre-line break-words text-sm text-muted-foreground">
                        {review.comment}
                      </p>
                    )}
                    <div className="-ml-2 flex gap-1">
                      <Button asChild variant="ghost" size="sm" className="h-8 px-2">
                        {/* Opens the restroom page with this review's edit form */}
                        <Link href={`/restroom/${review.restroomId}?review=edit#iyong-review`}>
                          <Pencil aria-hidden="true" />
                          {t.common.edit}
                        </Link>
                      </Button>
                      <DeleteReviewButton onConfirm={() => void handleDeleteReview(review)} />
                    </div>
                  </motion.li>
                ))}
              </ul>
            )}
          </section>

          {/* Reports this user made (only shown when there are some) */}
          {reports.length > 0 && (
            <section className="flex flex-col gap-2" aria-labelledby="reports-heading">
              <h2 id="reports-heading" className="font-semibold">
                {tm.profile.myReports}
              </h2>
              <ul className="divide-y overflow-hidden rounded-xl border bg-card shadow-sm">
                {reports.map((report) => (
                  <li key={report.id} className="flex items-start gap-3 p-3">
                    <Flag className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <p className="truncate text-sm font-medium">
                        <span className="text-muted-foreground">{tm.profile.reportOn[report.targetType]}: </span>
                        {report.target ? (
                          <Link href={"/restroom/" + report.target.restroomId} className="link-underline">
                            {report.target.name || t.profile.deletedRestroom}
                          </Link>
                        ) : (
                          <span className="italic text-muted-foreground">{tm.profile.removedTarget}</span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {tm.report.reasons[report.reason]} ·{" "}
                        <time dateTime={report.createdAt} suppressHydrationWarning>
                          {formatRelativeTime(report.createdAt, locale)}
                        </time>
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                      {tm.profile.reportStatus[report.status]}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}

      <Separator />

      {/* More: leaderboard, settings, about */}
      <section className="flex flex-col gap-2" aria-labelledby="more-heading">
        <h2 id="more-heading" className="font-semibold">
          {t.profile.more}
        </h2>
        <ul className="divide-y overflow-hidden rounded-xl border bg-card shadow-sm">
          {links.map(({ href, key, icon: Icon }) => (
            <li key={href}>
              <Link
                href={href}
                className="group flex w-full items-center gap-3 px-3 py-3 text-left text-sm transition-colors duration-150 hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="font-medium">{t.profile.links[key].label}</span>
                  <span className="truncate text-xs text-muted-foreground">{t.profile.links[key].description}</span>
                </span>
                <ChevronRight
                  className="h-4 w-4 text-muted-foreground transition-transform duration-150 group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {account && <LogoutButton />}
    </div>
  );
}

function GuestPrompt() {
  const { t } = useI18n();
  return (
    <section className="flex flex-col items-center gap-3 rounded-lg border p-6 text-center">
      <p className="font-semibold">{t.profile.guestTitle}</p>
      <p className="text-sm text-muted-foreground">{t.profile.guestDescription}</p>
      <div className="flex w-full flex-col gap-2">
        <Button asChild size="lg">
          <Link href={loginUrl("/profile")}>
            <LogIn aria-hidden="true" />
            {t.common.login}
          </Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link href={`/auth/signup?returnUrl=${encodeURIComponent("/profile")}`}>
            <UserPlus aria-hidden="true" />
            {t.common.signup}
          </Link>
        </Button>
      </div>
    </section>
  );
}
