import type { Amenity, Restroom } from "@/types/restroom";

/**
 * schema.org JSON-LD for a restroom page (type PublicToilet), so search
 * engines understand it's a place with an address, coordinates, amenities
 * and a rating. https://schema.org/PublicToilet
 */

// English names: structured data is read by machines, not shown to users
const AMENITY_NAMES: Record<Amenity, string> = {
  bidet: "Bidet",
  tissue: "Toilet paper",
  soap: "Soap",
  wheelchair: "Wheelchair accessible",
  "baby-changing": "Baby changing station",
  shower: "Shower",
  "air-conditioned": "Air-conditioned",
  free: "Free to use",
};

export function restroomJsonLd(restroom: Restroom, url: string): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "PublicToilet",
    "@id": url,
    url,
    name: restroom.name,
    ...(restroom.description ? { description: restroom.description } : {}),
    address: {
      "@type": "PostalAddress",
      streetAddress: restroom.address,
      addressCountry: "PH",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: restroom.latitude,
      longitude: restroom.longitude,
    },
    isAccessibleForFree: restroom.isFree,
    publicAccess: true,
    amenityFeature: restroom.amenities
      .filter((amenity) => amenity !== "free")
      .map((amenity) => ({ "@type": "LocationFeatureSpecification", name: AMENITY_NAMES[amenity], value: true })),
    ...(restroom.reviewCount > 0
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: restroom.rating,
            reviewCount: restroom.reviewCount,
            bestRating: 5,
            worstRating: 1,
          },
        }
      : {}),
  };
}

/**
 * JSON for a <script type="application/ld+json">. Escapes "<" so text from
 * users (names, descriptions) can't close the script tag.
 */
export function toJsonLdScript(data: Record<string, unknown>): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
