import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth/server";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { errorText } from "@/lib/i18n/errors";
import { getLocale } from "@/lib/i18n/server";
import { BannedError, toAppError } from "@/lib/moderation/errors";
import { createClient } from "@/lib/supabase/server";
import { isCrossSiteRequest } from "@/lib/security/same-origin";

/**
 * POST /api/verify — "Nakita ko na ito": confirm (or take back) that a
 * restroom exists.
 *
 * Body: { restroom_id, action: "verify" | "unverify" }
 * 200:  { verified: boolean, verified_count, status }
 * Errors: { error, code } — 401 unauthorized · 400 invalid · 403 banned / not_allowed
 *
 * One vote per user per restroom (primary key). A database trigger keeps
 * verified_count in sync and approves a pending restroom at 5 votes.
 * RLS blocks voting on your own restroom or a rejected one.
 */

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  restroom_id: z.string().uuid(),
  action: z.enum(["verify", "unverify"]),
});

type ErrorCode = "unauthorized" | "invalid" | "banned" | "not_allowed" | "server";

function errorResponse(status: number, code: ErrorCode, error: string) {
  return NextResponse.json({ error, code }, { status });
}

export async function POST(request: Request) {
  // CSRF: refuse POSTs sent from other websites
  if (isCrossSiteRequest(request)) return NextResponse.json({ code: "forbidden" }, { status: 403 });
  const t = getDictionary(getLocale());
  const tv = t.moderation.verify;

  const user = await getCurrentUser();
  if (!user) return errorResponse(401, "unauthorized", tv.loginDescription);

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return errorResponse(400, "invalid", t.common.unknownError);
  const { restroom_id, action } = parsed.data;

  const supabase = createClient();
  const { error } =
    action === "verify"
      ? await supabase.from("restroom_verifications").insert({ restroom_id, user_id: user.id })
      : await supabase.from("restroom_verifications").delete().eq("restroom_id", restroom_id).eq("user_id", user.id);

  // 23505 = already verified (e.g. in another tab): that's the state we want
  if (error && error.code !== "23505") {
    const appError = toAppError(error);
    if (appError instanceof BannedError) return errorResponse(403, "banned", errorText(appError, t));
    // 42501 = RLS refused: own restroom, rejected restroom, or it doesn't exist
    if (error.code === "42501") {
      return errorResponse(403, "not_allowed", tv.unavailable);
    }
    console.error("verify failed", error.message);
    return errorResponse(500, "server", t.common.unknownError);
  }

  const { data: restroom } = await supabase
    .from("restrooms")
    .select("verified_count, status")
    .eq("id", restroom_id)
    .maybeSingle();
  if (!restroom) return errorResponse(403, "not_allowed", tv.unavailable);

  return NextResponse.json({
    verified: action === "verify",
    verified_count: restroom.verified_count,
    status: restroom.status,
  });
}
