import type { Dictionary } from "@/lib/i18n/dictionaries";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { format } from "@/lib/i18n/format";
import { BannedError, RateLimitError } from "@/lib/moderation/errors";

export type ErrorKey = keyof Dictionary["errors"];

/**
 * An error whose message lives in the dictionary (t.errors[key]), so the UI
 * can show it in the current language. `message` is the Tagalog text, for logs.
 */
export class LocalizedError extends Error {
  constructor(public readonly key: ErrorKey) {
    super(getDictionary("tl").errors[key]);
    this.name = "LocalizedError";
  }
}

/**
 * Text to show for a caught error: the translated message for a
 * LocalizedError, the original message otherwise (e.g. from Supabase),
 * or a generic fallback.
 */
export function errorText(error: unknown, t: Dictionary, fallback: string = t.common.tryAgainLater): string {
  if (error instanceof LocalizedError) return t.errors[error.key];
  if (error instanceof BannedError) return format(t.errors.banned, { reason: error.reason || t.errors.noReason });
  if (error instanceof RateLimitError) {
    return error.kind === "restroom" ? t.errors.restroomRateLimit : t.errors.reportRateLimit;
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}
