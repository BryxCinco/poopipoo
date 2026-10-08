import { NextResponse } from "next/server";
import { z } from "zod";

import { AgentError, runAgent } from "@/lib/ai/agent";
import { embedMissingRestrooms } from "@/lib/ai/restroom-document";
import { getCurrentUser } from "@/lib/auth/server";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { format } from "@/lib/i18n/format";
import { getLocale } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";
import { isCrossSiteRequest } from "@/lib/security/same-origin";

/**
 * POST /api/agent — ask Poopipoo Assistant a question.
 *
 * Body: { message, user_lat?, user_lng?, history? }
 * 200:  { message, restrooms?, action? }
 * Errors: { error: string (in the visitor's language, for the UI), code }
 * Language: the app's language cookie (or Accept-Language); the answer uses it too.
 *   401 unauthorized · 400 invalid · 429 rate_limited / ai_busy · 502/503/504 upstream
 */

export const dynamic = "force-dynamic";

const RATE_LIMIT = 10; // requests…
const RATE_WINDOW_MS = 60_000; // …per minute, per user

const bodySchema = z
  .object({
    message: z.string().trim().min(1).max(500),
    user_lat: z.number().min(-90).max(90).optional(),
    user_lng: z.number().min(-180).max(180).optional(),
    history: z
      .array(
        z.object({
          role: z.enum(["user", "assistant"]),
          content: z.string().max(4000),
          // Ids come from the client, so tools still check them against the database
          restrooms: z.array(z.object({ id: z.string().uuid(), name: z.string().max(100) })).max(5).optional(),
        })
      )
      .max(20)
      .optional(),
  })
  // Both coordinates or neither
  .refine((body) => (body.user_lat === undefined) === (body.user_lng === undefined));

type ErrorCode = "unauthorized" | "invalid" | "rate_limited" | "ai_busy" | "upstream" | "config";

function errorResponse(status: number, code: ErrorCode, error: string, retryAfter?: number) {
  return NextResponse.json(
    { error, code, ...(retryAfter ? { retry_after: retryAfter } : {}) },
    { status, headers: retryAfter ? { "Retry-After": String(retryAfter) } : undefined }
  );
}

export async function POST(request: Request) {
  // CSRF: refuse POSTs sent from other websites
  if (isCrossSiteRequest(request)) return NextResponse.json({ code: "forbidden" }, { status: 403 });
  const locale = getLocale();
  const errors = getDictionary(locale).agent.errors;
  const user = await getCurrentUser();
  if (!user) return errorResponse(401, "unauthorized", errors.unauthorized);

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return errorResponse(400, "invalid", errors.invalid);
  const { message, user_lat, user_lng, history } = parsed.data;

  const supabase = createClient();

  // ---- rate limit: count this user's questions in the last minute ----
  // Stored in the database (agent_queries), so it holds across server
  // instances/restarts. Not atomic: two requests at the exact same moment
  // could both pass at 9, which is fine for this purpose.
  const since = new Date(Date.now() - RATE_WINDOW_MS).toISOString();
  const { data: recent, error: recentError } = await supabase
    .from("agent_queries")
    .select("created_at")
    .eq("user_id", user.id)
    .gte("created_at", since)
    .order("created_at", { ascending: true })
    .limit(RATE_LIMIT);
  if (recentError) {
    console.error("agent rate limit check failed", recentError.message);
    return errorResponse(503, "upstream", errors.server);
  }
  if (recent.length >= RATE_LIMIT) {
    const oldest = new Date(recent[0].created_at).getTime();
    const retryAfter = Math.max(1, Math.ceil((oldest + RATE_WINDOW_MS - Date.now()) / 1000));
    return errorResponse(
      429,
      "rate_limited",
      format(errors.rateLimited, { seconds: retryAfter }),
      retryAfter
    );
  }

  // Counts attempts (also used for the usage stats on the profile page)
  const { error: logError } = await supabase.from("agent_queries").insert({ user_id: user.id });
  if (logError) console.error("agent query log failed", logError.message);

  // Make newly added/edited restrooms searchable. Fire-and-forget so it
  // doesn't slow down this answer (runs on the Node server; never throws).
  void embedMissingRestrooms();

  try {
    const result = await runAgent({
      message,
      history,
      location: user_lat !== undefined && user_lng !== undefined ? { latitude: user_lat, longitude: user_lng } : null,
      client: supabase,
      locale,
    });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AgentError) {
      switch (error.kind) {
        case "rate-limit":
          return errorResponse(429, "ai_busy", errors.busy, 60);
        case "timeout":
          return errorResponse(504, "upstream", errors.timeout);
        case "config":
          console.error("agent config error:", error.message);
          return errorResponse(503, "config", errors.config);
        default:
          return errorResponse(502, "upstream", errors.upstream);
      }
    }
    console.error("agent failed", error);
    return errorResponse(500, "upstream", errors.unexpected);
  }
}
