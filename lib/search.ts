/**
 * Place search (text → locations) with OpenStreetMap Nominatim.
 * Free, no key. Usage policy: at most 1 request per second, and cache results.
 * https://operations.osmfoundation.org/policies/nominatim/
 *
 * - Results are cached in memory (same query → no new request).
 * - Requests are spaced at least 1 second apart; a newer search cancels an
 *   older one that is still waiting for its turn.
 * - Limited to the Philippines (countrycodes=ph).
 */

export interface SearchResult {
  /** Full address from Nominatim */
  display_name: string;
  lat: number;
  lon: number;
  /** OSM type, e.g. "restaurant", "mall", "city" */
  type: string;
  /** 0–1, higher = more prominent place */
  importance: number;
  /** OSM category, e.g. "amenity", "shop", "place" (used to pick an icon) */
  category: string;
  /** Short name for the first line (e.g. "SM Megamall"); falls back to the first part of the address */
  name: string;
}

export type SearchErrorKind = "rate-limit" | "network" | "server";

export class SearchError extends Error {
  constructor(
    public readonly kind: SearchErrorKind,
    message: string
  ) {
    super(message);
    this.name = "SearchError";
  }
}

const ENDPOINT = "https://nominatim.openstreetmap.org/search";
const MIN_INTERVAL_MS = 1000;
const CACHE_LIMIT = 100;
export const MIN_QUERY_LENGTH = 2;

// Query (normalized) → results. A Map keeps insertion order, so the oldest
// entry is the first key (simple LRU: re-insert on hit, drop the first when full).
const cache = new Map<string, SearchResult[]>();
let lastRequestAt = 0;
// Serializes requests so two searches never go out in the same second
let queue: Promise<unknown> = Promise.resolve();

const normalize = (query: string) => query.trim().replace(/\s+/g, " ").toLowerCase();

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function toResult(item: unknown): SearchResult | null {
  if (!isRecord(item)) return null;
  const displayName = typeof item.display_name === "string" ? item.display_name : "";
  const lat = Number(item.lat);
  const lon = Number(item.lon);
  if (!displayName || !Number.isFinite(lat) || !Number.isFinite(lon)) return null;

  const name =
    typeof item.name === "string" && item.name.trim() ? item.name.trim() : displayName.split(",")[0].trim();

  return {
    display_name: displayName,
    lat,
    lon,
    type: typeof item.type === "string" ? item.type : "",
    importance: typeof item.importance === "number" ? item.importance : 0,
    category:
      typeof item.class === "string" ? item.class : typeof item.category === "string" ? item.category : "",
    name,
  };
}

const sleep = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    if (ms <= 0) return resolve();
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        reject(signal.reason);
      },
      { once: true }
    );
  });

async function request(query: string, signal?: AbortSignal): Promise<SearchResult[]> {
  // Wait for our 1-second slot
  await sleep(lastRequestAt + MIN_INTERVAL_MS - Date.now(), signal);
  signal?.throwIfAborted();
  lastRequestAt = Date.now();

  const params = new URLSearchParams({
    q: query,
    format: "json",
    limit: "5",
    addressdetails: "1",
    "accept-language": "en",
    countrycodes: "ph",
  });

  let response: Response;
  try {
    response = await fetch(`${ENDPOINT}?${params.toString()}`, {
      signal,
      headers: { Accept: "application/json" },
    });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new SearchError("network", "Walang internet o hindi maabot ang search.");
  }

  if (response.status === 429) {
    // Back off a little longer before the next request
    lastRequestAt = Date.now() + 2000;
    throw new SearchError("rate-limit", "Sobrang dami ng search. Maghintay sandali.");
  }
  if (!response.ok) {
    throw new SearchError("server", `Hindi gumana ang search (${response.status}).`);
  }

  const data: unknown = await response.json();
  if (!Array.isArray(data)) return [];
  // OSM often has the same place twice (e.g. the mall building and the mall
  // point), with the same address: keep the first (most important) one.
  const seen = new Set<string>();
  return data
    .map(toResult)
    .filter((result): result is SearchResult => result !== null)
    .filter((result) => {
      const key = `${result.name}|${result.display_name}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

/**
 * Searches places in the Philippines. Pass an AbortSignal to cancel (e.g. the
 * user kept typing); a cancelled search rejects with an AbortError.
 */
export async function searchLocation(query: string, signal?: AbortSignal): Promise<SearchResult[]> {
  const key = normalize(query);
  if (key.length < MIN_QUERY_LENGTH) return [];

  const cached = cache.get(key);
  if (cached) {
    cache.delete(key);
    cache.set(key, cached);
    return cached;
  }

  // Chain onto the queue so requests run one at a time
  const run = queue.then(() => request(key, signal));
  queue = run.catch(() => undefined);
  const results = await run;

  cache.set(key, results);
  if (cache.size > CACHE_LIMIT) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  return results;
}

export const isAbortError = (error: unknown): boolean =>
  error instanceof DOMException && error.name === "AbortError";
