import { NextResponse } from "next/server";

import { DEMO_REVIEW_TTL_MS, getDemoUserId, isDemoUser } from "@/lib/auth/demo";
import { isCrossSiteRequest } from "@/lib/security/same-origin";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/auth/demo — signs the visitor in to the shared demo account.
 *
 * 200:  { ok: true } — the session cookies are set (a new session each time,
 *       which is what the AI's per-session limit counts).
 * Errors: { code } — 403 forbidden · 503 unavailable (not set up) · 500 server
 *
 * No password: the server makes a one-time magic-link token with the secret
 * key and redeems it right away, so changing the demo password can't lock
 * the demo out. It refuses any account without app_metadata.demo, so a wrong
 * DEMO_USER_ID can never sign people in to a real account.
 */

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  // CSRF: refuse POSTs sent from other websites
  if (isCrossSiteRequest(request)) return NextResponse.json({ code: "forbidden" }, { status: 403 });

  const demoUserId = getDemoUserId();
  if (!demoUserId) return NextResponse.json({ code: "unavailable" }, { status: 503 });

  const admin = createAdminClient();
  const { data: found, error: findError } = await admin.auth.admin.getUserById(demoUserId);
  if (findError || !found.user?.email || !isDemoUser(found.user)) {
    console.error("demo login: DEMO_USER_ID is not a demo account", findError?.message);
    return NextResponse.json({ code: "unavailable" }, { status: 503 });
  }

  const { data: link, error: linkError } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: found.user.email,
  });
  if (linkError) {
    console.error("demo login: generateLink failed", linkError.message);
    return NextResponse.json({ code: "server" }, { status: 500 });
  }

  // Redeem the token as this visitor: sets the session cookies
  const { error: verifyError } = await createClient().auth.verifyOtp({
    type: "magiclink",
    token_hash: link.properties.hashed_token,
  });
  if (verifyError) {
    console.error("demo login: verifyOtp failed", verifyError.message);
    return NextResponse.json({ code: "server" }, { status: 500 });
  }

  // Everyone shares the account: clear out old demo reviews (best effort).
  // They were only visible to the demo account anyway (0009).
  const cutoff = new Date(Date.now() - DEMO_REVIEW_TTL_MS).toISOString();
  const { error: cleanupError } = await admin
    .from("reviews")
    .delete()
    .eq("user_id", demoUserId)
    .lt("created_at", cutoff);
  if (cleanupError) console.error("demo login: review cleanup failed", cleanupError.message);

  return NextResponse.json({ ok: true });
}
