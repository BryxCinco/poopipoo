import { LocalizedError } from "@/lib/i18n/errors";

/**
 * Errors raised by the Phase 11 database triggers (0005_moderation.sql),
 * turned into typed errors so the UI can show them in the user's language.
 * The trigger messages are fixed English strings; the extra info is in `details`.
 */

/** The signed-in user is banned (any write). */
export class BannedError extends Error {
  constructor(public readonly reason: string) {
    super(`Account banned: ${reason}`);
    this.name = "BannedError";
  }
}

/** Too many restrooms (1 / 5 min, 5 / day, 20 / week) or reports (10 / day). */
export class RateLimitError extends Error {
  constructor(
    public readonly kind: "restroom" | "report",
    /** When it's allowed again */
    public readonly retryAt: Date
  ) {
    super(`Rate limit exceeded until ${retryAt.toISOString()}`);
    this.name = "RateLimitError";
  }
}

/** Shape shared by PostgREST errors from supabase-js. */
interface DbError {
  message: string;
  details?: string | null;
  code?: string;
}

function parseRetryAt(details: string | null | undefined): Date {
  const date = details ? new Date(details) : new Date(NaN);
  // Fallback: 5 minutes from now (the shortest window)
  return Number.isNaN(date.getTime()) ? new Date(Date.now() + 5 * 60_000) : date;
}

/** A Supabase error → BannedError / RateLimitError / LocalizedError / plain Error. */
export function toAppError(error: DbError): Error {
  switch (error.message) {
    case "Account banned":
      return new BannedError(error.details ?? "");
    case "Rate limit exceeded":
      return new RateLimitError("restroom", parseRetryAt(error.details));
    case "Report limit exceeded":
      return new RateLimitError("report", parseRetryAt(error.details));
    case "Forbidden":
      return new LocalizedError("forbidden");
    default:
      return new Error(error.message);
  }
}
