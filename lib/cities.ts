/**
 * Cities Poopipoo has OpenStreetMap restrooms for. Shared by the OSM import
 * (which area to fetch), the city pages (/city/[slug]) and the sitemap.
 *
 * Metro Manila uses its admin boundary (ISO 3166-2 PH-00). The other cities
 * use a bounding box around the urban area, which is simpler and doesn't
 * depend on how the boundary is tagged in OSM; the box also catches
 * neighbouring towns in the same metro (e.g. Mandaue and Lapu-Lapu for Cebu).
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

const bbox = ({ south, west, north, east }: Bounds) => ({ setup: "", filter: `(${south},${west},${north},${east})` });

export const CITIES: readonly City[] = [
  {
    slug: "metro-manila",
    name: "Metro Manila",
    fallbackAddress: "Metro Manila",
    bounds: { south: 14.34, west: 120.9, north: 14.79, east: 121.14 },
    overpassArea: { setup: `area["ISO3166-2"="PH-00"]->.city;`, filter: "(area.city)" },
  },
  {
    slug: "cebu",
    name: "Cebu",
    fallbackAddress: "Cebu City",
    bounds: { south: 10.24, west: 123.8, north: 10.42, east: 124.02 },
    overpassArea: bbox({ south: 10.24, west: 123.8, north: 10.42, east: 124.02 }),
  },
  {
    slug: "davao",
    name: "Davao",
    fallbackAddress: "Davao City",
    bounds: { south: 6.98, west: 125.45, north: 7.2, east: 125.68 },
    overpassArea: bbox({ south: 6.98, west: 125.45, north: 7.2, east: 125.68 }),
  },
  {
    slug: "iloilo",
    name: "Iloilo",
    fallbackAddress: "Iloilo City",
    bounds: { south: 10.67, west: 122.49, north: 10.78, east: 122.62 },
    overpassArea: bbox({ south: 10.67, west: 122.49, north: 10.78, east: 122.62 }),
  },
  {
    slug: "bacolod",
    name: "Bacolod",
    fallbackAddress: "Bacolod City",
    bounds: { south: 10.6, west: 122.9, north: 10.72, east: 123.02 },
    overpassArea: bbox({ south: 10.6, west: 122.9, north: 10.72, east: 123.02 }),
  },
];

export function getCity(slug: string): City | undefined {
  return CITIES.find((city) => city.slug === slug);
}

export function isInBounds(latitude: number, longitude: number, b: Bounds): boolean {
  return latitude >= b.south && latitude <= b.north && longitude >= b.west && longitude <= b.east;
}

/** "Metro Manila, Cebu, Davao, Iloilo and Bacolod" (or "at" in Tagalog). */
export function cityList(and: string): string {
  const names = CITIES.map((city) => city.name);
  return `${names.slice(0, -1).join(", ")} ${and} ${names[names.length - 1]}`;
}
