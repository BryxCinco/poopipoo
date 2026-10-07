import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth/server";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { errorText } from "@/lib/i18n/errors";
import { getLocale } from "@/lib/i18n/server";
import { BannedError, RateLimitError, toAppError } from "@/lib/moderation/errors";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/report — report a restroom or review as fake, spam, etc.
 *
 * Body: { target_type: "restroom" | "review", target_id, reason, details? }
 * 201:  { ok: true }
 * Errors: { error (in the visitor's language), code }
 *   401 unauthorized · 400 invalid / own · 403 banned · 404 not_found
 *   409 already_reported · 429 rate_limited (+ retry_at)
 *
 * The insert runs as the signed-in user (RLS). Database triggers
 * (0005_moderation.sql) do the rest atomically: the 10-per-day limit, the
 * target check, flag_count + 1, and status 'flagged' at 3 / 'rejected' at 5.
 */

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  target_type: z.enum(["restroom", "review"]),
  target_id: z.string().uuid(),
  reason: z.enum(["fake", "inappropriate", "spam", "duplicate", "other"]),
  details: z.string().trim().max(500).optional(),
});

type ErrorCode = "unauthorized" | "invalid" | "own" | "banned" | "not_found" | "already_reported" | "rate_limited" | "server";

function errorResponse(status: number, code: ErrorCode, error: string, extra: Record<string, string> = {}) {
  return NextResponse.json({ error, code, ...extra }, { status });
}

export async function POST(request: Request) {
  const t = getDictionary(getLocale());
  const tr = t.moderation.report;

  const user = await getCurrentUser();
  if (!user) return errorResponse(401, "unauthorized", tr.loginDescription);

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return errorResponse(400, "invalid", t.common.unknownError);
  const { target_type, target_id, reason, details } = parsed.data;

  const { error } = await createClient()
    .from("reports")
    .insert({ reporter_id: user.id, target_type, target_id, reason, details: details || null });

  if (!error) return NextResponse.json({ ok: true }, { status: 201 });

  if (error.code === "23505") return errorResponse(409, "already_reported", tr.already);
  if (error.message === "Report target not found") return errorResponse(404, "not_found", tr.notFound);
  if (error.message === "Cannot report own content") return errorResponse(400, "own", tr.own);

  const appError = toAppError(error);
  if (appError instanceof BannedError) return errorResponse(403, "banned", errorText(appError, t));
  if (appError instanceof RateLimitError) {
    return errorResponse(429, "rate_limited", errorText(appError, t), { retry_at: appError.retryAt.toISOString() });
  }
  console.error("report insert failed", error.message);
  return errorResponse(500, "server", t.common.unknownError);
}
