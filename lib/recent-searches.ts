import type { SearchResult } from "@/lib/search";

/**
 * Last 5 picked place-search results, saved per device in localStorage.
 * Every read/write is wrapped: storage can be blocked (private mode, etc.).
 */

const KEY = "poopipoo:recent-searches";
const MAX_RECENT = 5;

function isSearchResult(value: unknown): value is SearchResult {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.display_name === "string" &&
    typeof v.name === "string" &&
    typeof v.lat === "number" &&
    typeof v.lon === "number" &&
    typeof v.type === "string" &&
    typeof v.category === "string" &&
    typeof v.importance === "number"
  );
}

export function loadRecentSearches(): SearchResult[] {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter(isSearchResult).slice(0, MAX_RECENT) : [];
  } catch {
    return [];
  }
}

/** Adds a result to the top (removing an older copy of the same place). Returns the new list. */
export function addRecentSearch(result: SearchResult): SearchResult[] {
  const sameAs = (other: SearchResult) =>
    other.display_name === result.display_name && other.lat === result.lat && other.lon === result.lon;
  const next = [result, ...loadRecentSearches().filter((item) => !sameAs(item))].slice(0, MAX_RECENT);
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // storage blocked: the list just isn't remembered
  }
  return next;
}

export function clearRecentSearches(): void {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
