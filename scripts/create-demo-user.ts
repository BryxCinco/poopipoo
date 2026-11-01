/**
 * Creates (or repairs) the shared demo account for demo mode (Phase 15).
 *
 *   npx tsx scripts/create-demo-user.ts
 *
 * Run supabase/migrations/0009_demo_mode.sql first. Uses the secret key.
 * Safe to re-run. Then set the printed id as DEMO_USER_ID (in .env.local and
 * in Vercel → Settings → Environment Variables) and redeploy.
 *
 * The account gets a random password nobody knows: the "Try demo" button
 * signs in with a one-time token instead (app/api/auth/demo/route.ts).
 */
import { randomBytes } from "node:crypto";

import { createAdminClient } from "@/lib/supabase/admin";

// Node 20.12+: load .env.local since this runs outside Next.js
process.loadEnvFile(".env.local");

// example.com is reserved: no real person can own this address
const DEMO_EMAIL = process.env.DEMO_EMAIL || "demo@example.com";
const DEMO_USERNAME = "Demo Guest";

async function findUserIdByEmail(email: string): Promise<string | null> {
  const admin = createAdminClient();
  for (let page = 1; ; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error(`Could not list users: ${error.message}`);
    const match = data.users.find((user) => user.email?.toLowerCase() === email.toLowerCase());
    if (match) return match.id;
    if (data.users.length < 1000) return null;
  }
}

async function main(): Promise<void> {
  const admin = createAdminClient();

  let userId = await findUserIdByEmail(DEMO_EMAIL);
  if (userId) {
    // app_metadata can only be changed with the secret key
    const { error } = await admin.auth.admin.updateUserById(userId, { app_metadata: { demo: true } });
    if (error) throw new Error(`Could not update the demo user: ${error.message}`);
    console.log(`Demo user already exists: ${DEMO_EMAIL}`);
  } else {
    const { data, error } = await admin.auth.admin.createUser({
      email: DEMO_EMAIL,
      password: randomBytes(32).toString("base64url"),
      email_confirm: true,
      app_metadata: { demo: true },
      user_metadata: { username: DEMO_USERNAME },
    });
    if (error) throw new Error(`Could not create the demo user: ${error.message}`);
    userId = data.user.id;
    console.log(`Created demo user: ${DEMO_EMAIL}`);
  }

  // The database side of the flag (0009): read-only rules, no points, private reviews
  const { error: profileError } = await admin
    .from("profiles")
    .update({ is_demo: true, username: DEMO_USERNAME })
    .eq("id", userId);
  if (profileError) {
    throw new Error(`Could not mark the profile as demo (did you run 0009_demo_mode.sql?): ${profileError.message}`);
  }

  console.log(`\nDEMO_USER_ID=${userId}`);
  console.log("Add it to .env.local and to the Vercel environment variables, then redeploy.");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
