import type { Dictionary } from "@/lib/i18n/dictionaries";

/** Maps common Supabase Auth error messages to friendly text in the current language. */
export function friendlyAuthError(message: string, t: Dictionary["auth"]["errors"]): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) return t.invalidCredentials;
  if (m.includes("email not confirmed")) return t.emailNotConfirmed;
  if (m.includes("already registered") || m.includes("already been registered")) return t.alreadyRegistered;
  if (m.includes("password should be") || m.includes("weak password")) return t.weakPassword;
  if (m.includes("rate limit") || m.includes("too many")) return t.rateLimit;
  if (m.includes("failed to fetch") || m.includes("network")) return t.network;
  return message;
}
