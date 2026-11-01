import { NextResponse } from "next/server";
import { z } from "zod";

import { isDemoUser } from "@/lib/auth/demo";
import { getCurrentUser } from "@/lib/auth/server";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getLocale } from "@/lib/i18n/server";
import { isCrossSiteRequest } from "@/lib/security/same-origin";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/account/delete — permanently deletes the signed-in user's account.
 *
 * Body: { username } — must match the account's username (typed in the
 *       confirmation modal), so a stray request can't delete an account.
 * 200:  { ok: true } — the session cookies are cleared too.
 * Errors: { error (in the visitor's language), code }
 *   401 unauthorized · 400 invalid / mismatch · 403 demo · 500 server
 *
 * Steps (secret key, server only):
 * 1. Log it in moderation_log (action 'delete_account', needs 0007).
 * 2. Remove the user's avatar files (storage doesn't cascade).
 * 3. Delete the auth user. Foreign keys do the rest: profile, reviews, votes,
 *    reports, verifications and agent history are deleted; restrooms the user
 *    added stay, with created_by set to NULL.
 */

export const dynamic = "force-dynamic";

const bodySchema = z.object({ username: z.string().trim().min(1).max(40) });

type ErrorCode = "unauthorized" | "invalid" | "mismatch" | "demo" | "server";

function errorResponse(status: number, code: ErrorCode, error: string) {
  return NextResponse.json({ error, code }, { status });
}

export async function POST(request: Request) {
  // CSRF: refuse POSTs sent from other websites
  if (isCrossSiteRequest(request)) return NextResponse.json({ code: "forbidden" }, { status: 403 });
  const t = getDictionary(getLocale());
  const td = t.settings.deleteAccountFlow;

  const user = await getCurrentUser();
  if (!user) return errorResponse(401, "unauthorized", td.loginRequired);
  // The shared demo account can't be deleted (lib/auth/demo.ts)
  if (isDemoUser(user)) return errorResponse(403, "demo", t.errors.demoReadOnly);

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return errorResponse(400, "invalid", td.mismatch);

  const admin = createAdminClient();
  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("username, is_banned")
    .eq("id", user.id)
    .maybeSingle();
  if (profileError) {
    console.error("account delete: profile read failed", profileError.message);
    return errorResponse(500, "server", td.failed);
  }
  // Accounts without a profile row can still be deleted by confirming the email's name
  const expected = profile?.username ?? user.email?.split("@")[0] ?? "";
  if (parsed.data.username.toLowerCase() !== expected.trim().toLowerCase()) {
    return errorResponse(400, "mismatch", td.mismatch);
  }

  // 1. Log first, so there's a record even if the request dies halfway.
  //    moderator_id = the user themselves (set to NULL by the cascade).
  const { data: logRow, error: logError } = await admin
    .from("moderation_log")
    .insert({
      moderator_id: user.id,
      action: "delete_account",
      target_type: "user",
      target_id: user.id,
      reason: profile?.is_banned ? "Self-service deletion (account was banned)" : "Self-service deletion",
    })
    .select("id")
    .single();
  if (logError) {
    // Most likely migration 0007 hasn't been run (check constraint)
    console.error("account delete: log insert failed", logError.message);
    return errorResponse(500, "server", td.failed);
  }

  // 2. Avatar files: best effort (leftovers are harmless, nothing links to them)
  try {
    const { data: files } = await admin.storage.from("avatars").list(user.id);
    const paths = (files ?? []).map((file) => `${user.id}/${file.name}`);
    if (paths.length > 0) await admin.storage.from("avatars").remove(paths);
  } catch (error) {
    console.error("account delete: avatar cleanup failed", error);
  }

  // 3. The account itself
  const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
  if (deleteError) {
    console.error("account delete: deleteUser failed", deleteError.message);
    // Nothing was deleted: drop the log entry so it doesn't claim otherwise
    await admin.from("moderation_log").delete().eq("id", logRow.id);
    return errorResponse(500, "server", td.failed);
  }

  // Clear the session cookies (the refresh token no longer works anyway)
  await createClient()
    .auth.signOut({ scope: "local" })
    .catch(() => undefined);

  return NextResponse.json({ ok: true });
}
