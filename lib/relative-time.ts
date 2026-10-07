import { INTL_LOCALE, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";

// Relative dates, e.g. "2 araw ang nakalipas" / "2 days ago".
// numeric: "always" because "auto" gives awkward phrases like "Araw bago ang kahapon".
const formatters = new Map<Locale, { relative: Intl.RelativeTimeFormat; absolute: Intl.DateTimeFormat }>();

function getFormatters(locale: Locale) {
  let entry = formatters.get(locale);
  if (!entry) {
    entry = {
      relative: new Intl.RelativeTimeFormat(INTL_LOCALE[locale], { numeric: "always" }),
      absolute: new Intl.DateTimeFormat(INTL_LOCALE[locale], { dateStyle: "medium" }),
    };
    formatters.set(locale, entry);
  }
  return entry;
}

const MINUTE = 60;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;
const MONTH = 30 * DAY;
const YEAR = 365 * DAY;

export function formatRelativeTime(iso: string, locale: Locale, now: number = Date.now()): string {
  const rtf = getFormatters(locale).relative;
  const t = getDictionary(locale).time;
  const seconds = Math.round((new Date(iso).getTime() - now) / 1000);
  const abs = Math.abs(seconds);

  if (abs < MINUTE) return t.justNow;
  if (abs < HOUR) return rtf.format(Math.round(seconds / MINUTE), "minute");
  if (abs < DAY) return rtf.format(Math.round(seconds / HOUR), "hour");
  if (abs < 2 * DAY && seconds < 0) return t.yesterday;
  if (abs < WEEK) return rtf.format(Math.round(seconds / DAY), "day");
  if (abs < MONTH) return rtf.format(Math.round(seconds / WEEK), "week");
  if (abs < YEAR) return rtf.format(Math.round(seconds / MONTH), "month");
  return rtf.format(Math.round(seconds / YEAR), "year");
}

/** Full date for tooltips, e.g. "Okt 1, 2026" / "Oct 1, 2026". */
export function formatAbsoluteDate(iso: string, locale: Locale): string {
  return getFormatters(locale).absolute.format(new Date(iso));
}
