import { cache } from "react";

import { getCurrentUser } from "@/lib/auth/server";
import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/types/database";

/** The signed-in user's moderation-related profile fields. */
export interface ViewerModeration {
  userId: string;
  role: UserRole;
  isModerator: boolean;
  isBanned: boolean;
  banReason: string | null;
  bannedAt: string | null;
  trustScore: number;
}

/**
 * Server only. Role/ban/trust of the current user, or null for guests.
 * Cached per request (pages and their metadata share one query).
 * The database enforces everything again (RLS + triggers); this is for the UI.
 */
export const getViewerModeration = cache(async (): Promise<ViewerModeration | null> => {
  const user = await getCurrentUser();
  if (!user) return null;
  const { data } = await createClient()
    .from("profiles")
    .select("role, is_banned, ban_reason, banned_at, trust_score")
    .eq("id", user.id)
    .maybeSingle();
  const role = data?.role ?? "user";
  return {
    userId: user.id,
    role,
    isModerator: role === "moderator" || role === "admin",
    isBanned: data?.is_banned ?? false,
    banReason: data?.ban_reason ?? null,
    bannedAt: data?.banned_at ?? null,
    trustScore: data?.trust_score ?? 0,
  };
});
