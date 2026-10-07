import { Compass, Crown, Flag, MessageSquareText, MessagesSquare, ThumbsUp, type LucideIcon } from "lucide-react";

import { MAX_LEVEL } from "@/lib/levels";

/**
 * Badges. Safe to import anywhere (no server code here).
 *
 * Badge ids are saved in profiles.badges. Users can't write that column; the
 * server adds new badges with the secret key (lib/gamification/server.ts),
 * using checkBadges() below with counts it loaded itself.
 *
 * Badges are kept once earned, even if the count later drops (e.g. a review
 * is deleted), so nobody "loses" an achievement.
 */

export type BadgeId = "first-cr" | "reviewer" | "explorer" | "top-reviewer" | "helpful" | "legend";

/** What a user has done so far (counted on the server). */
export interface BadgeStats {
  restroomsAdded: number;
  reviewsWritten: number;
  helpfulVotesReceived: number;
  level: number;
}

export interface BadgeDef {
  id: BadgeId;
  name: string;
  /** How to earn it (Filipino) */
  description: string;
  icon: LucideIcon;
  /** Progress toward the badge: [current, goal] */
  progress: (stats: BadgeStats) => [number, number];
}

export const BADGES: readonly BadgeDef[] = [
  {
    id: "first-cr",
    name: "First CR",
    description: "Mag-add ng unang CR",
    icon: Flag,
    progress: (s) => [s.restroomsAdded, 1],
  },
  {
    id: "reviewer",
    name: "Reviewer",
    description: "Mag-review ng 5 CR",
    icon: MessageSquareText,
    progress: (s) => [s.reviewsWritten, 5],
  },
  {
    id: "explorer",
    name: "Explorer",
    description: "Mag-add ng 10 CR",
    icon: Compass,
    progress: (s) => [s.restroomsAdded, 10],
  },
  {
    id: "top-reviewer",
    name: "Top Reviewer",
    description: "Mag-review ng 20 CR",
    icon: MessagesSquare,
    progress: (s) => [s.reviewsWritten, 20],
  },
  {
    id: "helpful",
    name: "Helpful",
    description: "Makatanggap ng 10 helpful votes",
    icon: ThumbsUp,
    progress: (s) => [s.helpfulVotesReceived, 10],
  },
  {
    id: "legend",
    name: "Legend",
    description: `Umabot sa Level ${MAX_LEVEL}`,
    icon: Crown,
    progress: (s) => [s.level, MAX_LEVEL],
  },
];

const BADGE_IDS = new Set<string>(BADGES.map((badge) => badge.id));

export function isBadgeId(value: string): value is BadgeId {
  return BADGE_IDS.has(value);
}

export function isEarned(badge: BadgeDef, stats: BadgeStats): boolean {
  const [current, goal] = badge.progress(stats);
  return current >= goal;
}

/**
 * Badges the user has just earned: met the goal but not yet in
 * `profile.badges`. Returns an empty array when nothing is new.
 */
export function checkBadges(profile: { badges: readonly string[] }, stats: BadgeStats): BadgeId[] {
  const owned = new Set(profile.badges);
  return BADGES.filter((badge) => !owned.has(badge.id) && isEarned(badge, stats)).map((badge) => badge.id);
}
