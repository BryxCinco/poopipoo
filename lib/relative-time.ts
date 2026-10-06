// Filipino relative dates, e.g. "2 araw ang nakalipas".
// numeric: "always" because "auto" gives awkward phrases like "Araw bago ang kahapon".
const rtf = new Intl.RelativeTimeFormat("fil", { numeric: "always" });
const absolute = new Intl.DateTimeFormat("fil", { dateStyle: "medium" });

const MINUTE = 60;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;
const MONTH = 30 * DAY;
const YEAR = 365 * DAY;

export function formatRelativeTime(iso: string, now: number = Date.now()): string {
  const seconds = Math.round((new Date(iso).getTime() - now) / 1000);
  const abs = Math.abs(seconds);

  if (abs < MINUTE) return "ngayon lang";
  if (abs < HOUR) return rtf.format(Math.round(seconds / MINUTE), "minute");
  if (abs < DAY) return rtf.format(Math.round(seconds / HOUR), "hour");
  if (abs < 2 * DAY && seconds < 0) return "kahapon";
  if (abs < WEEK) return rtf.format(Math.round(seconds / DAY), "day");
  if (abs < MONTH) return rtf.format(Math.round(seconds / WEEK), "week");
  if (abs < YEAR) return rtf.format(Math.round(seconds / MONTH), "month");
  return rtf.format(Math.round(seconds / YEAR), "year");
}

/** Full date for tooltips, e.g. "Okt 1, 2026". */
export function formatAbsoluteDate(iso: string): string {
  return absolute.format(new Date(iso));
}
