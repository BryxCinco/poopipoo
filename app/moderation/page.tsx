import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Map as MapIcon, ShieldX } from "lucide-react";

import { StatusScreen } from "@/components/layout/StatusScreen";
import {
  ModerationDashboard,
  type BannedUserItem,
  type FlaggedRestroomItem,
  type ReportedItem,
  type UncheckedRestroomItem,
} from "@/components/moderation/ModerationDashboard";
import { Button } from "@/components/ui/button";
import { loginUrl } from "@/lib/auth/return-url";
import { getT } from "@/lib/i18n/server";
import { pageMetadata } from "@/lib/metadata";
import { getViewerModeration } from "@/lib/moderation/server";
import { createClient } from "@/lib/supabase/server";

export function generateMetadata(): Metadata {
  const { title, description } = getT().meta.moderation;
  return { ...pageMetadata({ title, description, path: "/moderation" }), robots: { index: false } };
}

const LIST_LIMIT = 50;

/**
 * Moderation dashboard (moderators and admins only). Loaded with the
 * moderator's own session: RLS lets moderators read hidden (rejected) rows,
 * all reports and the log. Actions call SECURITY DEFINER functions that check
 * the role again (0005_moderation.sql).
 */
export default async function ModerationPage() {
  const viewer = await getViewerModeration();
  if (!viewer) redirect(loginUrl("/moderation"));

  if (!viewer.isModerator) {
    const t = getT();
    return (
      <StatusScreen
        code="403"
        icon={<ShieldX />}
        title={t.moderation.dashboard.forbiddenTitle}
        description={t.moderation.dashboard.forbiddenDescription}
        actions={
          <Button asChild size="lg">
            <Link href="/">
              <MapIcon aria-hidden="true" />
              {t.status.backToMap}
            </Link>
          </Button>
        }
      />
    );
  }

  const supabase = createClient();
  const [flaggedResult, reportsResult, bannedResult, uncheckedResult] = await Promise.all([
    supabase
      .from("restrooms")
      .select(
        "id, name, address, flag_count, ai_flagged, ai_flag_reason, created_at, created_by, profiles!restrooms_created_by_fkey(username)"
      )
      .eq("status", "flagged")
      .order("created_at", { ascending: false })
      .limit(LIST_LIMIT),
    supabase
      .from("reports")
      .select("id, target_type, target_id, reason, details, created_at, profiles!reports_reporter_id_fkey(username)")
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(LIST_LIMIT * 2),
    supabase
      .from("profiles")
      .select("id, username, ban_reason, banned_at")
      .eq("is_banned", true)
      .order("banned_at", { ascending: false })
      .limit(LIST_LIMIT),
    supabase
      .from("restrooms")
      .select("id, name, address, created_at, profiles!restrooms_created_by_fkey(username)")
      .is("ai_checked_at", null)
      .neq("status", "rejected")
      .order("created_at", { ascending: false })
      .limit(20),
  ]);
  for (const result of [flaggedResult, reportsResult, bannedResult, uncheckedResult]) {
    if (result.error) throw new Error(result.error.message);
  }
  const reports = reportsResult.data ?? [];

  // ---- what each report is about (grouped: one card per reported item) ----
  const restroomIds = Array.from(new Set(reports.filter((r) => r.target_type === "restroom").map((r) => r.target_id)));
  const reviewIds = Array.from(new Set(reports.filter((r) => r.target_type === "review").map((r) => r.target_id)));
  const [restroomTargets, reviewTargets] = await Promise.all([
    restroomIds.length > 0
      ? supabase
          .from("restrooms")
          .select("id, name, address, status, created_by, profiles!restrooms_created_by_fkey(username)")
          .in("id", restroomIds)
      : null,
    reviewIds.length > 0
      ? supabase
          .from("reviews")
          .select("id, comment, rating, status, user_id, restroom_id, restrooms(name), profiles!reviews_user_id_fkey(username)")
          .in("id", reviewIds)
      : null,
  ]);

  const grouped = new Map<string, ReportedItem>();
  for (const report of reports) {
    if (report.target_type === "user") continue; // not reportable from the app yet
    const key = `${report.target_type}:${report.target_id}`;
    let item = grouped.get(key);
    if (!item) {
      const restroom = restroomTargets?.data?.find((r) => r.id === report.target_id);
      const review = reviewTargets?.data?.find((r) => r.id === report.target_id);
      item = {
        targetType: report.target_type,
        targetId: report.target_id,
        // null = deleted
        title: report.target_type === "restroom" ? (restroom?.name ?? null) : (review?.restrooms?.name ?? null),
        excerpt: report.target_type === "review" ? (review?.comment ?? null) : (restroom?.address ?? null),
        restroomId: report.target_type === "restroom" ? (restroom?.id ?? null) : (review?.restroom_id ?? null),
        authorId: report.target_type === "restroom" ? (restroom?.created_by ?? null) : (review?.user_id ?? null),
        authorName:
          report.target_type === "restroom"
            ? (restroom?.profiles?.username ?? null)
            : (review?.profiles?.username ?? null),
        status: report.target_type === "restroom" ? (restroom?.status ?? null) : (review?.status ?? null),
        reports: [],
      };
      grouped.set(key, item);
    }
    item.reports.push({
      id: report.id,
      reporterName: report.profiles?.username ?? null,
      reason: report.reason,
      details: report.details,
      createdAt: report.created_at,
    });
  }

  const flagged: FlaggedRestroomItem[] = (flaggedResult.data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    address: row.address,
    flagCount: row.flag_count,
    aiReason: row.ai_flagged ? row.ai_flag_reason : null,
    authorId: row.created_by,
    authorName: row.profiles?.username ?? null,
    createdAt: row.created_at,
  }));

  const banned: BannedUserItem[] = (bannedResult.data ?? []).map((row) => ({
    id: row.id,
    username: row.username,
    reason: row.ban_reason,
    bannedAt: row.banned_at,
  }));

  const unchecked: UncheckedRestroomItem[] = (uncheckedResult.data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    address: row.address,
    authorName: row.profiles?.username ?? null,
    createdAt: row.created_at,
  }));

  return (
    <ModerationDashboard
      viewerId={viewer.userId}
      flagged={flagged}
      reported={Array.from(grouped.values())}
      banned={banned}
      unchecked={unchecked}
    />
  );
}
