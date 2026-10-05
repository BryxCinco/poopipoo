import { ALL_AMENITIES } from "@/lib/icons";
import type { RestroomInsert, RestroomRow } from "@/types/database";
import type { Amenity, Restroom } from "@/types/restroom";

const AMENITY_SET = new Set<string>(ALL_AMENITIES);

function isAmenity(value: string): value is Amenity {
  return AMENITY_SET.has(value);
}

/** DB row (snake_case) → app type (camelCase). Unknown amenities are dropped. */
export function rowToRestroom(row: RestroomRow): Restroom {
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
