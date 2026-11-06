/**
 * Cities Poopipoo has OpenStreetMap restrooms for. Shared by the OSM import
 * (which area to fetch), the city pages (/city/[slug]) and the sitemap.
 *
 * Metro Manila only for now, to build up data in one place first. It uses its
 * admin boundary (ISO 3166-2 PH-00). Users can still add restrooms anywhere.
 */

export interface Bounds {
  south: number;
  west: number;
  north: number;
  east: number;
}

export interface City {
  slug: string;
  /** Same in English and Tagalog */
  name: string;
  /** Used when a restroom has no address at all */
  fallbackAddress: string;
  bounds: Bounds;
  /** Overpass filter that selects the area (appended to each query statement) */
  overpassArea: { setup: string; filter: string };
}

export const CITIES: readonly City[] = [
  {
    slug: "metro-manila",
    name: "Metro Manila",
    fallbackAddress: "Metro Manila",
    bounds: { south: 14.34, west: 120.9, north: 14.79, east: 121.14 },
    overpassArea: { setup: `area["ISO3166-2"="PH-00"]->.city;`, filter: "(area.city)" },
  },
];

export function getCity(slug: string): City | undefined {
  return CITIES.find((city) => city.slug === slug);
}

export function isInBounds(latitude: number, longitude: number, b: Bounds): boolean {
  return latitude >= b.south && latitude <= b.north && longitude >= b.west && longitude <= b.east;
}

/** "Metro Manila"; with more cities, "A, B and C" (or "at" in Tagalog). */
export function cityList(and: string): string {
  const names = CITIES.map((city) => city.name);
  if (names.length === 1) return names[0];
  return `${names.slice(0, -1).join(", ")} ${and} ${names[names.length - 1]}`;
}
