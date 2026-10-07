import { checkBadges, isBadgeId, type BadgeId, type BadgeStats } from "@/lib/badges";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Server only. Saves badges the user has newly earned.
 *
 * `stats` must come from the server's own queries (never from the browser),
 * because this writes with the secret key: users can't update
 * profiles.badges themselves (see 0004_gamification.sql).
 *
 * Returns the newly added badge ids (for a "new badge" toast). Never throws:
 * badges are a bonus, so a failure here must not break the page.
 */
export async function syncBadges(
  userId: string,
  currentBadges: readonly string[],
  stats: BadgeStats
): Promise<BadgeId[]> {
  const earned = checkBadges({ badges: currentBadges }, stats);
  if (earned.length === 0) return [];

  try {
    // Keep only known ids, plus the new ones (no duplicates)
    const badges = Array.from(new Set([...currentBadges.filter(isBadgeId), ...earned]));
    const { error } = await createAdminClient().from("profiles").update({ badges }).eq("id", userId);
    if (error) throw new Error(error.message);
    return earned;
  } catch (error) {
    console.error("[badges] could not save new badges:", error instanceof Error ? error.message : error);
    return [];
  }
}
