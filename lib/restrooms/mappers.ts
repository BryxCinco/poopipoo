import { ALL_AMENITIES } from "@/lib/icons";
import type { RestroomInsert, RestroomRow } from "@/types/database";
import type { Amenity, Restroom } from "@/types/restroom";

const AMENITY_SET = new Set<string>(ALL_AMENITIES);

/**
 * Every restrooms column except `embedding` (384 numbers, only needed by the
 * vector search). Use this instead of select("*"). supabase-js infers the
 * row type (RestroomRow) from this literal string.
 */
export const RESTROOM_COLUMNS =
  "id, name, description, address, latitude, longitude, amenities, is_free, images, rating, review_count, created_by, created_at, updated_at, status, verified_count, source" as const;

function isAmenity(value: string): value is Amenity {
  return AMENITY_SET.has(value);
}

/**
 * DB row (snake_case) → app type (camelCase). Unknown amenities are dropped.
 * `source` is optional because the vector search (match_restrooms) doesn't return it.
 */
export function rowToRestroom(row: Omit<RestroomRow, "source"> & { source?: RestroomRow["source"] }): Restroom {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    latitude: row.latitude,
    longitude: row.longitude,
    address: row.address,
    rating: row.rating,
    reviewCount: row.review_count,
    amenities: row.amenities.filter(isAmenity),
    images: row.images,
    isFree: row.is_free,
    createdAt: row.created_at,
    createdBy: row.created_by,
    status: row.status,
    verifiedCount: row.verified_count,
    source: row.source,
  };
}

/** Fields a user can submit when adding a restroom. */
export type NewRestroom = Pick<
  Restroom,
  "name" | "description" | "address" | "latitude" | "longitude" | "amenities" | "isFree" | "images"
>;

/** App data → insert payload. Rating/review counts are server-managed. */
export function newRestroomToInsert(data: NewRestroom, userId: string): RestroomInsert {
  return {
    name: data.name.trim(),
    description: data.description.trim(),
    address: data.address.trim(),
    latitude: data.latitude,
    longitude: data.longitude,
    amenities: data.amenities,
    is_free: data.isFree,
    images: data.images,
    created_by: userId,
  };
}

/** Postgres/PostgREST ids are UUIDs; anything else can't exist (avoids a DB error). */
export function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}
