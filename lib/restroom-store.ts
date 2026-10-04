import { ALL_AMENITIES } from "@/lib/icons";
import { MOCK_RESTROOMS } from "@/lib/mock-restrooms";
import type { Amenity, Restroom } from "@/types/restroom";

/**
 * Tiny client-side store for restrooms added by the user.
 *
 * - Persists to localStorage (until Supabase replaces this).
 * - Exposes `subscribe` + snapshot getters for React's `useSyncExternalStore`.
 * - Snapshots are cached so the same array is returned until data changes
 *   (useSyncExternalStore re-renders forever if a new array is returned each call).
 * - Syncs across tabs via the `storage` event.
 */

const STORAGE_KEY = "poopipoo:user-restrooms:v1";
const ID_PREFIX = "user-";

export type NewRestroom = Omit<Restroom, "id" | "createdAt">;

const EMPTY: Restroom[] = [];
const listeners = new Set<() => void>();

// `null` = not read from localStorage yet.
let userCache: Restroom[] | null = null;
let allCache: Restroom[] | null = null;

// ---------- localStorage helpers ----------

const AMENITY_SET = new Set<string>(ALL_AMENITIES);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/** Validates data read from localStorage (it could be stale or edited by hand). */
function isRestroom(value: unknown): value is Restroom {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    typeof value.description === "string" &&
    typeof value.latitude === "number" &&
    typeof value.longitude === "number" &&
    typeof value.address === "string" &&
    typeof value.rating === "number" &&
    typeof value.reviewCount === "number" &&
    Array.isArray(value.amenities) &&
    value.amenities.every((a): a is Amenity => typeof a === "string" && AMENITY_SET.has(a)) &&
    Array.isArray(value.images) &&
    value.images.every((img) => typeof img === "string") &&
    typeof value.isFree === "boolean" &&
    typeof value.createdAt === "string"
  );
}

function readStorage(): Restroom[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isRestroom) : [];
  } catch {
    // Corrupt JSON or storage blocked (e.g. some private modes)
    return [];
  }
}

function writeStorage(restrooms: Restroom[]): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(restrooms));
  } catch {
    // Quota exceeded or storage blocked — keep the in-memory copy at least.
  }
}

function setUserRestrooms(next: Restroom[]): void {
  userCache = next;
  allCache = null;
  writeStorage(next);
  listeners.forEach((listener) => listener());
}

function generateId(): string {
  // crypto.randomUUID only exists on secure origins (HTTPS/localhost),
  // so fall back for e.g. testing on a phone over the LAN.
  const random =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  return `${ID_PREFIX}${random}`;
}

// ---------- public API ----------

/** User-added restrooms, newest first. Empty on the server. */
export function getUserRestrooms(): Restroom[] {
  if (typeof window === "undefined") return EMPTY;
  if (userCache === null) userCache = readStorage();
  return userCache;
}

/** Mock + user-added restrooms. */
export function getAllRestrooms(): Restroom[] {
  if (typeof window === "undefined") return MOCK_RESTROOMS;
  if (allCache === null) allCache = [...MOCK_RESTROOMS, ...getUserRestrooms()];
  return allCache;
}

export function getRestroomById(id: string): Restroom | undefined {
  return getAllRestrooms().find((restroom) => restroom.id === id);
}

export function isUserRestroom(id: string): boolean {
  return getUserRestrooms().some((restroom) => restroom.id === id);
}

export function addUserRestroom(data: NewRestroom): Restroom {
  const restroom: Restroom = {
    ...data,
    id: generateId(),
    createdAt: new Date().toISOString(),
  };
  setUserRestrooms([restroom, ...getUserRestrooms()]);
  return restroom;
}

export function removeUserRestroom(id: string): void {
  setUserRestrooms(getUserRestrooms().filter((restroom) => restroom.id !== id));
}

// ---------- useSyncExternalStore plumbing ----------

function handleStorageEvent(event: StorageEvent): void {
  if (event.key !== STORAGE_KEY) return;
  // Another tab changed the data: re-read on next snapshot.
  userCache = null;
  allCache = null;
  listeners.forEach((listener) => listener());
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  if (listeners.size === 1) window.addEventListener("storage", handleStorageEvent);

  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) window.removeEventListener("storage", handleStorageEvent);
  };
}

/** Server (and hydration) snapshots: localStorage isn't available, so mock data only. */
export const getServerUserRestrooms = (): Restroom[] => EMPTY;
export const getServerAllRestrooms = (): Restroom[] => MOCK_RESTROOMS;
