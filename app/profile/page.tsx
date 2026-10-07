import type { Metadata } from "next";

import {
  ProfileView,
  type ProfileAccount,
  type ProfileReport,
  type ProfileReview,
} from "@/components/profile/ProfileView";
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
    return <ProfileView account={null} restrooms={[]} reviews={[]} reports={[]} />;
  }

  const supabase = createClient();
  const [profileResult, restroomsResult, reviewsResult, reportsResult] = await Promise.all([
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
    // Phase 11: the user's own reports (RLS: read own)
    supabase
      .from("reports")
      .select("id, target_type, target_id, reason, status, created_at")
      .eq("reporter_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  // Thrown errors are shown by app/error.tsx with a retry button
  if (profileResult.error) throw new Error(profileResult.error.message);
  if (restroomsResult.error) throw new Error(restroomsResult.error.message);
  if (reviewsResult.error) throw new Error(reviewsResult.error.message);
  // Reports are secondary: show the rest of the profile if they fail
  const reportRows = reportsResult.error ? [] : reportsResult.data;

  // Look up the names of reviewed restrooms
  const reviewedIds = Array.from(new Set(reviewsResult.data.map((review) => review.restroom_id)));
  const names = new Map<string, string>();
  if (reviewedIds.length > 0) {
    const { data, error } = await supabase.from("restrooms").select("id, name").in("id", reviewedIds);
    if (error) throw new Error(error.message);
    data.forEach((row) => names.set(row.id, row.name));
  }

  // What each report was about. Missing = deleted or hidden (RLS), shown as such.
  const reportedRestroomIds = reportRows.filter((r) => r.target_type === "restroom").map((r) => r.target_id);
  const reportedReviewIds = reportRows.filter((r) => r.target_type === "review").map((r) => r.target_id);
  const targetNames = new Map<string, { name: string; restroomId: string }>();
  const [reportedRestrooms, reportedReviews] = await Promise.all([
    reportedRestroomIds.length > 0
      ? supabase.from("restrooms").select("id, name").in("id", reportedRestroomIds)
      : null,
    reportedReviewIds.length > 0
      ? supabase.from("reviews").select("id, restroom_id, restrooms(name)").in("id", reportedReviewIds)
      : null,
  ]);
  reportedRestrooms?.data?.forEach((row) => targetNames.set(row.id, { name: row.name, restroomId: row.id }));
  reportedReviews?.data?.forEach((row) =>
    targetNames.set(row.id, { name: row.restrooms?.name ?? "", restroomId: row.restroom_id })
  );
  const reports: ProfileReport[] = reportRows.map((report) => ({
    id: report.id,
    targetType: report.target_type,
    target: targetNames.get(report.target_id) ?? null,
    reason: report.reason,
    status: report.status,
    createdAt: report.created_at,
  }));

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
    trustScore: profile?.trust_score ?? 0,
    isModerator: profile?.role === "moderator" || profile?.role === "admin",
    ban: profile?.is_banned ? { reason: profile.ban_reason, at: profile.banned_at } : null,
  };

  const reviews: ProfileReview[] = reviewsResult.data.map((review) => ({
    id: review.id,
    restroomId: review.restroom_id,
    restroomName: names.get(review.restroom_id) ?? null,
    rating: review.rating,
    comment: review.comment,
    createdAt: review.created_at,
  }));

  return (
    <ProfileView
      account={account}
      restrooms={restroomsResult.data.map(rowToRestroom)}
      reviews={reviews}
      reports={reports}
    />
  );
}
