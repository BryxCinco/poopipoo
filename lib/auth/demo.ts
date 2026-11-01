import type { User } from "@supabase/supabase-js";

/**
 * Demo mode (Phase 15): one shared account that recruiters/clients can use
 * without signing up (the "Try demo" button → POST /api/auth/demo).
 *
 * The account is marked twice by scripts/create-demo-user.ts:
 * - app_metadata.demo = true: for the app (only the server's secret key can
 *   change app_metadata, so the client can't remove it).
 * - profiles.is_demo = true: for the database, which enforces the read-only
 *   rules (0009_demo_mode.sql).
 */

/** AI questions per demo sign-in (each "Try demo" click is a new session). */
export const DEMO_AI_PER_SESSION = 3;
/** AI questions per hour for the demo account as a whole (stops scripted abuse of the Groq quota). */
export const DEMO_AI_PER_HOUR = 30;
/** Demo reviews older than this are deleted on the next demo sign-in. */
export const DEMO_REVIEW_TTL_MS = 60 * 60 * 1000;

export function isDemoUser(user: Pick<User, "app_metadata"> | null | undefined): boolean {
  return user?.app_metadata?.demo === true;
}

/** Server only: the demo account's id (null when demo mode isn't set up). */
export function getDemoUserId(): string | null {
  return process.env.DEMO_USER_ID || null;
}
