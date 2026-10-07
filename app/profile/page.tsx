import type { Metadata } from "next";

import { ProfileView, type ProfileAccount, type ProfileReview } from "@/components/profile/ProfileView";
import type { BadgeStats } from "@/lib/badges";
import { getCurrentUser } from "@/lib/auth/server";
import { syncBadges } from "@/lib/gamification/server";
import { getT } from "@/lib/i18n/server";
import { calculateLevel } from "@/lib/levels";
import { pageMetadata } from "@/lib/metadata";
import { RESTROOM_COLUMNS, rowToRestroom } from "@/lib/restrooms/mappers";
import { createClient } from "@/lib/supabase/server";

export function generateMetadata(): Metadata {
  const { title, description } = getT().meta.profile;
  return pageMetadata({ title, description, path: "/profile" });
}

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) {
    return <ProfileView account={null} restrooms={[]} reviews={[]} />;
  }

  const supabase = createClient();
  const [profileResult, restroomsResult, reviewsResult] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    supabase
      .from("restrooms")
      .select(RESTROOM_COLUMNS)
      .eq("created_by", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("reviews")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
  ]);

  // Thrown errors are shown by app/error.tsx with a retry button
  if (profileResult.error) throw new Error(profileResult.error.message);
  if (restroomsResult.error) throw new Error(restroomsResult.error.message);
  if (reviewsResult.error) throw new Error(reviewsResult.error.message);

  // Look up the names of reviewed restrooms
  const reviewedIds = Array.from(new Set(reviewsResult.data.map((review) => review.restroom_id)));
  const names = new Map<string, string>();
  if (reviewedIds.length > 0) {
    const { data, error } = await supabase.from("restrooms").select("id, name").in("id", reviewedIds);
    if (error) throw new Error(error.message);
    data.forEach((row) => names.set(row.id, row.name));
  }

  const profile = profileResult.data;
  const points = profile?.points ?? 0;
  const helpfulVotesReceived = reviewsResult.data.reduce((sum, review) => sum + review.helpful_count, 0);

  // Counted here on the server, so they can be trusted for awarding badges
  const stats: BadgeStats = {
    restroomsAdded: restroomsResult.data.length,
    reviewsWritten: reviewsResult.data.length,
    helpfulVotesReceived,
    level: profile?.level ?? calculateLevel(points),
  };
  const savedBadges = profile?.badges ?? [];
  const newBadges = profile ? await syncBadges(user.id, savedBadges, stats) : [];

  const account: ProfileAccount = {
    id: user.id,
    email: user.email ?? "",
    username: profile?.username ?? user.email?.split("@")[0] ?? getT().common.user,
    avatarUrl: profile?.avatar_url ?? null,
    points,
    stats,
    badges: Array.from(new Set([...savedBadges, ...newBadges])),
    newBadges,
  };

  const reviews: ProfileReview[] = reviewsResult.data.map((review) => ({
    id: review.id,
    restroomId: review.restroom_id,
    restroomName: names.get(review.restroom_id) ?? null,
    rating: review.rating,
    comment: review.comment,
    createdAt: review.created_at,
  }));

  return <ProfileView account={account} restrooms={restroomsResult.data.map(rowToRestroom)} reviews={reviews} />;
}
