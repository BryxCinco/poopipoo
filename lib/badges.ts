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
  /** Also the key of its name/description in t.badges.items */
  id: BadgeId;
  icon: LucideIcon;
  /** Progress toward the badge: [current, goal] */
  progress: (stats: BadgeStats) => [number, number];
}

export const BADGES: readonly BadgeDef[] = [
  {
    id: "first-cr",
    icon: Flag,
    progress: (s) => [s.restroomsAdded, 1],
  },
  {
    id: "reviewer",
    icon: MessageSquareText,
    progress: (s) => [s.reviewsWritten, 5],
  },
  {
    id: "explorer",
    icon: Compass,
    progress: (s) => [s.restroomsAdded, 10],
  },
  {
    id: "top-reviewer",
    icon: MessagesSquare,
    progress: (s) => [s.reviewsWritten, 20],
  },
  {
    id: "helpful",
    icon: ThumbsUp,
    progress: (s) => [s.helpfulVotesReceived, 10],
  },
  {
    id: "legend",
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
