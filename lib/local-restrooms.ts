import { ALL_AMENITIES } from "@/lib/icons";
import type { Amenity, Restroom } from "@/types/restroom";

/**
 * Restrooms saved in localStorage by the Phase 4 guest flow. New restrooms now
 * go to Supabase; this only exists so signed-in users can upload what they
 * added on this device before accounts existed.
 */

const STORAGE_KEY = "poopipoo:user-restrooms:v1";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

const AMENITY_SET = new Set<string>(ALL_AMENITIES);

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

/** Client-only. Returns [] on the server or if storage is empty/corrupt/blocked. */
export function getLocalRestrooms(): Restroom[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isRestroom) : [];
  } catch {
    return [];
  }
}

/** Keeps only the given restrooms (e.g. the ones not uploaded yet). */
export function setLocalRestrooms(restrooms: Restroom[]): void {
  if (restrooms.length === 0) {
    clearLocalRestrooms();
    return;
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(restrooms));
  } catch {
    // Storage blocked: nothing to update.
  }
}

export function clearLocalRestrooms(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage blocked — nothing to clear.
  }
}
