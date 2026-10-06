"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Award,
  ChevronRight,
  Globe,
  Info,
  LogIn,
  MapPin,
  MessageSquare,
  Pencil,
  Plus,
  Toilet,
  User,
  UserPlus,
  type LucideIcon,
} from "lucide-react";

import { LogoutButton } from "@/components/auth/LogoutButton";
import { AgentSettings, type AgentUsage } from "@/components/profile/AgentSettings";
import { ThemeSetting } from "@/components/profile/ThemeSetting";
import { DeleteRestroomButton } from "@/components/restroom/DeleteRestroomButton";
import { DeleteReviewButton } from "@/components/restroom/DeleteReviewButton";
import { LocalRestroomsUpload } from "@/components/restroom/LocalRestroomsUpload";
import { StarRating } from "@/components/restroom/StarRating";
import { AnimatedCard } from "@/components/ui/AnimatedCard";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CountUp } from "@/components/ui/CountUp";
import { EmptyState } from "@/components/ui/EmptyState";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { SPRING, staggerContainer, staggerItem, staggerItemCapped } from "@/lib/animations";
import { loginUrl } from "@/lib/auth/return-url";
import { formatRelativeTime } from "@/lib/relative-time";
import { invalidateRestrooms } from "@/lib/restroom-store";
import { deleteReview } from "@/lib/reviews/queries";
import { createClient } from "@/lib/supabase/client";
import type { Restroom } from "@/types/restroom";

export interface ProfileAccount {
  id: string;
  email: string;
  username: string;
  avatarUrl: string | null;
  points: number;
}

export interface ProfileReview {
  id: string;
  restroomId: string;
  restroomName: string;
  rating: number;
  comment: string;
  createdAt: string;
}

interface ProfileViewProps {
  /** null for guests */
  account: ProfileAccount | null;
  restrooms: Restroom[];
  reviews: ProfileReview[];
  /** AI agent usage; null for guests or if it couldn't be loaded */
  agentUsage: AgentUsage | null;
}

// Still "Soon" (dark mode is the real ThemeSetting row)
const SETTINGS: { label: string; icon: LucideIcon }[] = [
  { label: "Language", icon: Globe },
  { label: "About", icon: Info },
];

export function ProfileView({ account, restrooms, reviews, agentUsage }: ProfileViewProps) {
  const router = useRouter();
  const { toast } = useToast();
  // Restrooms hidden right away while their delete is in flight (optimistic UI)
  const [hiddenIds, setHiddenIds] = useState<ReadonlySet<string>>(new Set());

  const visibleRestrooms = restrooms.filter((restroom) => !hiddenIds.has(restroom.id));
  const visibleReviews = reviews.filter((review) => !hiddenIds.has(review.id));

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
      toast({ title: "Nabura ang review mo.", description: review.restroomName });
      invalidateRestrooms(); // the restroom's rating changed
      router.refresh();
    } catch (error) {
      setHidden(review.id, false);
      toast({
        variant: "destructive",
        title: "Hindi mabura ang review",
        description: error instanceof Error ? error.message : "Subukan ulit mamaya.",
      });
    }
  };

  const comingSoon = (title: string) =>
    toast({ title, description: "Malapit na ito sa susunod na update." });

  const stats: { label: string; value: number; icon: LucideIcon }[] = [
    { label: "Mga naidagdag na CR", value: visibleRestrooms.length, icon: Toilet },
    { label: "Mga review", value: visibleReviews.length, icon: MessageSquare },
    { label: "Points", value: account?.points ?? 0, icon: Award },
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
          <h1 className="truncate text-xl font-bold">{account ? account.username : "Guest User"}</h1>
          <p className="truncate text-sm text-muted-foreground">
            {account ? account.email : "Hindi pa naka-login"}
          </p>
        </div>
      </section>

      {/* Restrooms saved on this device before accounts existed */}
      <LocalRestroomsUpload userId={account?.id ?? null} returnUrl="/profile" />

      {!account ? (
        <GuestPrompt />
      ) : (
        <>
          {/* Stats */}
          <motion.section
            aria-label="Stats"
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

          {/* User's restrooms */}
          <section className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Aking mga CR</h2>
              {visibleRestrooms.length > 0 && (
                <Button asChild variant="ghost" size="sm" className="h-8 px-2">
                  <Link href="/add">
                    <Plus aria-hidden="true" />
                    Magdagdag
                  </Link>
                </Button>
              )}
            </div>

            {visibleRestrooms.length === 0 ? (
              <div className="rounded-xl border border-dashed">
                <EmptyState
                  compact
                  icon={<Toilet />}
                  title="Wala ka pang naidagdag na CR"
                  description="May alam kang malinis na CR? I-share mo sa iba!"
                  action={
                    <Button asChild>
                      <Link href="/add">
                        <Plus aria-hidden="true" />
                        Magdagdag ng CR
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
            <h2 className="font-semibold">Aking mga review</h2>
            {visibleReviews.length === 0 ? (
              <div className="rounded-xl border border-dashed">
                <EmptyState
                  compact
                  icon={<MessageSquare />}
                  title="Wala ka pang review."
                  description="Nakagamit ka na ba ng CR kamakailan? I-rate mo!"
                  action={
                    <Button asChild variant="outline" size="sm">
                      <Link href="/list">Maghanap ng CR</Link>
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
                      <span className="link-underline truncate font-medium">{review.restroomName}</span>
                      <time
                        dateTime={review.createdAt}
                        className="shrink-0 text-xs text-muted-foreground"
                        suppressHydrationWarning
                      >
                        {formatRelativeTime(review.createdAt)}
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
                          I-edit
                        </Link>
                      </Button>
                      <DeleteReviewButton onConfirm={() => void handleDeleteReview(review)} />
                    </div>
                  </motion.li>
                ))}
              </ul>
            )}
          </section>

          <AgentSettings usage={agentUsage} />
        </>
      )}

      <Separator />

      {/* Settings (placeholders) */}
      <section className="flex flex-col gap-2">
        <h2 className="font-semibold">Settings</h2>
        <ul className="divide-y rounded-xl border bg-card shadow-sm">
          <li>
            <ThemeSetting />
          </li>
          {SETTINGS.map(({ label, icon: Icon }) => (
            <li key={label}>
              <button
                type="button"
                onClick={() => comingSoon(label)}
                className="group flex w-full items-center gap-3 px-3 py-3 text-left text-sm transition-colors duration-150 first:rounded-t-xl last:rounded-b-xl hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none"
              >
                <Icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                <span className="flex-1">{label}</span>
                <Badge variant="secondary" className="font-normal">
                  Soon
                </Badge>
                <ChevronRight
                  className="h-4 w-4 text-muted-foreground transition-transform duration-150 group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </button>
            </li>
          ))}
        </ul>
      </section>

      {account && <LogoutButton />}
    </div>
  );
}

function GuestPrompt() {
  return (
    <section className="flex flex-col items-center gap-3 rounded-lg border p-6 text-center">
      <p className="font-semibold">Mag-login para makapag-ambag</p>
      <p className="text-sm text-muted-foreground">
        Kailangan ng account para makapag-add ng CR at makita ang mga contribution mo.
      </p>
      <div className="flex w-full flex-col gap-2">
        <Button asChild size="lg">
          <Link href={loginUrl("/profile")}>
            <LogIn aria-hidden="true" />
            Mag-login
          </Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link href={`/auth/signup?returnUrl=${encodeURIComponent("/profile")}`}>
            <UserPlus aria-hidden="true" />
            Gumawa ng account
          </Link>
        </Button>
      </div>
    </section>
  );
}
