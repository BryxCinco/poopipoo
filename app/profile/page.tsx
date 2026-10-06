import type { Metadata } from "next";

import type { AgentUsage } from "@/components/profile/AgentSettings";
import { ProfileView, type ProfileAccount, type ProfileReview } from "@/components/profile/ProfileView";
import { getCurrentUser } from "@/lib/auth/server";
import { RESTROOM_COLUMNS, rowToRestroom } from "@/lib/restrooms/mappers";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Poopipoo — Profile",
};

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) {
    return <ProfileView account={null} restrooms={[]} reviews={[]} agentUsage={null} />;
  }

  const supabase = createClient();
  // Start of today in Manila (UTC+8, no daylight saving)
  const MANILA_OFFSET_MS = 8 * 60 * 60 * 1000;
  const DAY_MS = 24 * 60 * 60 * 1000;
  const startOfToday = new Date(
    Math.floor((Date.now() + MANILA_OFFSET_MS) / DAY_MS) * DAY_MS - MANILA_OFFSET_MS
  ).toISOString();

  const [profileResult, restroomsResult, reviewsResult, agentTotalResult, agentTodayResult] = await Promise.all([
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
    // AI agent usage (counts only, no rows)
    supabase.from("agent_queries").select("id", { count: "exact", head: true }).eq("user_id", user.id),
    supabase
      .from("agent_queries")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", startOfToday),
  ]);

  // Thrown errors are shown by app/error.tsx with a retry button
  if (profileResult.error) throw new Error(profileResult.error.message);
  if (restroomsResult.error) throw new Error(restroomsResult.error.message);
  if (reviewsResult.error) throw new Error(reviewsResult.error.message);

  // Look up the names of reviewed restrooms (reviews are written in Phase 6)
  const reviewedIds = Array.from(new Set(reviewsResult.data.map((review) => review.restroom_id)));
  const names = new Map<string, string>();
  if (reviewedIds.length > 0) {
    const { data, error } = await supabase.from("restrooms").select("id, name").in("id", reviewedIds);
    if (error) throw new Error(error.message);
    data.forEach((row) => names.set(row.id, row.name));
  }

  // Usage stats are optional: show "-" instead of failing the whole page
  const agentUsage: AgentUsage | null =
    agentTotalResult.error || agentTodayResult.error
      ? null
      : { total: agentTotalResult.count ?? 0, today: agentTodayResult.count ?? 0 };

  const profile = profileResult.data;
  const account: ProfileAccount = {
    id: user.id,
    email: user.email ?? "",
    username: profile?.username ?? user.email?.split("@")[0] ?? "User",
    avatarUrl: profile?.avatar_url ?? null,
    points: profile?.points ?? 0,
  };

  const reviews: ProfileReview[] = reviewsResult.data.map((review) => ({
    id: review.id,
    restroomId: review.restroom_id,
    restroomName: names.get(review.restroom_id) ?? "Naburang CR",
    rating: review.rating,
    comment: review.comment,
    createdAt: review.created_at,
  }));

  return (
    <ProfileView
      account={account}
      restrooms={restroomsResult.data.map(rowToRestroom)}
      reviews={reviews}
      agentUsage={agentUsage}
    />
  );
}
