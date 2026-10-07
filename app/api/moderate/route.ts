import { NextResponse } from "next/server";
import { z } from "zod";

import { FLAG_CONFIDENCE, moderateRestroom, ModerationError, type ModerationContext } from "@/lib/ai/moderation";
import { getCurrentUser } from "@/lib/auth/server";
import { calculateDistance } from "@/lib/distance";
import { getViewerModeration } from "@/lib/moderation/server";
import { RESTROOM_COLUMNS, rowToRestroom } from "@/lib/restrooms/mappers";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * POST /api/moderate — AI check of a newly added restroom.
 *
 * Body: { restroom_id }
 * 200:  { checked: true, flagged: boolean, result? }  (result only for moderators)
 *       { checked: false, reason: "already_checked" }
 * Errors: { code } — 401 unauthorized · 400 invalid · 403 forbidden · 404 not_found
 *   429 ai_busy · 502/503/504 ai_failed (the restroom stays unchecked; a
 *   moderator can run it again from /moderation)
 *
 * Called by the add form right after saving (the author), or from the
 * moderation dashboard (moderators, any restroom, also re-checks).
 * Authors can only trigger it once per restroom, so it can't be used to burn
 * the Groq quota. Reads and writes with the secret key: the AI result columns
 * are read-only for users.
 */

export const dynamic = "force-dynamic";

const bodySchema = z.object({ restroom_id: z.string().uuid() });

// ~110 m box around the restroom for the duplicate check
const NEARBY_DEGREES = 0.001;
const NEARBY_MAX_METERS = 100;

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ code: "unauthorized" }, { status: 401 });

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ code: "invalid" }, { status: 400 });

  const admin = createAdminClient();
  const { data: row } = await admin
    .from("restrooms")
    .select(`${RESTROOM_COLUMNS}, ai_checked_at`)
    .eq("id", parsed.data.restroom_id)
    .maybeSingle();
  if (!row) return NextResponse.json({ code: "not_found" }, { status: 404 });

  const viewer = await getViewerModeration();
  const isModerator = viewer?.isModerator ?? false;
  if (!isModerator) {
    if (row.created_by !== user.id) return NextResponse.json({ code: "forbidden" }, { status: 403 });
    if (row.ai_checked_at) return NextResponse.json({ checked: false, reason: "already_checked" });
  }

  const restroom = rowToRestroom(row);

  // ---- facts for the AI: nearby restrooms + the author's recent activity ----
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const [nearbyResult, recentResult] = await Promise.all([
    admin
      .from("restrooms")
      .select("id, name, address, latitude, longitude")
      .neq("id", restroom.id)
      .neq("status", "rejected")
      .gte("latitude", restroom.latitude - NEARBY_DEGREES)
      .lte("latitude", restroom.latitude + NEARBY_DEGREES)
      .gte("longitude", restroom.longitude - NEARBY_DEGREES)
      .lte("longitude", restroom.longitude + NEARBY_DEGREES)
      .limit(20),
    row.created_by
      ? admin
          .from("restroom_submissions")
          .select("id", { count: "exact", head: true })
          .eq("user_id", row.created_by)
          .gte("submitted_at", since)
      : null,
  ]);

  const context: ModerationContext = {
    nearby: (nearbyResult.data ?? [])
      .map((r) => ({
        name: r.name,
        address: r.address,
        distanceMeters: calculateDistance(restroom.latitude, restroom.longitude, r.latitude, r.longitude) * 1000,
      }))
      .filter((r) => r.distanceMeters <= NEARBY_MAX_METERS)
      .sort((a, b) => a.distanceMeters - b.distanceMeters),
    recentSubmissions: recentResult?.count ?? 0,
  };

  try {
    const result = await moderateRestroom(restroom, context);
    const { data: flagged, error } = await admin.rpc("record_ai_moderation", {
      restroom_id: restroom.id,
      is_suspicious: result.is_suspicious,
      reason: result.reason,
      confidence: result.confidence,
    });
    if (error) throw new Error(error.message);
    return NextResponse.json({
      checked: true,
      flagged: flagged === true,
      // The AI's reasoning is for moderators only
      ...(isModerator ? { result, threshold: FLAG_CONFIDENCE } : {}),
    });
  } catch (error) {
    if (error instanceof ModerationError) {
      const status = error.kind === "rate-limit" ? 429 : error.kind === "timeout" ? 504 : error.kind === "config" ? 503 : 502;
      if (error.kind === "config") console.error("AI moderation config error:", error.message);
      return NextResponse.json({ code: error.kind === "rate-limit" ? "ai_busy" : "ai_failed" }, { status });
    }
    console.error("AI moderation failed", error);
    return NextResponse.json({ code: "ai_failed" }, { status: 500 });
  }
}
