import type { Amenity } from "@/types/restroom";

/**
 * OpenStreetMap restrooms (amenity=toilets) in Metro Manila, via the free
 * Overpass API. Used by scripts/import-osm.ts.
 *
 * Data © OpenStreetMap contributors, ODbL 1.0
 * (https://www.openstreetmap.org/copyright). Anything shown from it must be
 * credited (About page + "Data © OpenStreetMap contributors" on each page).
 */

// Public Overpass instances (free). The main one is often busy (504/429),
// so the import tries each in turn.
export const OVERPASS_URLS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];

/** Rough box around Metro Manila: a sanity check on top of the area filter. */
const METRO_MANILA_BOUNDS = { south: 14.34, north: 14.79, west: 120.9, east: 121.14 };

// Metro Manila's admin boundary (NCR). ISO 3166-2 code PH-00 identifies it
// without depending on the name's spelling.
const OVERPASS_QUERY = `
[out:json][timeout:120];
area["ISO3166-2"="PH-00"]->.ncr;
nwr["amenity"="toilets"](area.ncr);
out center tags;
`;

export type OsmElementType = "node" | "way" | "relation";

/** A restroom parsed from OSM, ready to import. */
export interface OsmRestroom {
  osmType: OsmElementType;
  osmId: string;
  /** OSM name, or "Public CR" when it has none */
  name: string;
  /** True when OSM had a name (unnamed ones are matched more loosely when deduplicating) */
  named: boolean;
  /** Built from addr:* tags; null when there are none */
  address: string | null;
  latitude: number;
  longitude: number;
  amenities: Amenity[];
  isFree: boolean;
  /** Short Tagalog note from tags (hours, access, unisex) */
  description: string;
}

interface OverpassElement {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

function isOverpassElement(value: unknown): value is OverpassElement {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return typeof v.type === "string" && typeof v.id === "number";
}

const NAME_MAX = 80;
const DESCRIPTION_MAX = 500;
const ADDRESS_MAX = 200;

const yes = (value: string | undefined) => value === "yes" || value === "designated";

/** "addr:housenumber addr:street, addr:suburb, addr:city" from whatever exists. */
function buildAddress(tags: Record<string, string>): string | null {
  const street = [tags["addr:housenumber"], tags["addr:street"]].filter(Boolean).join(" ");
  const parts = [
    tags["addr:place"],
    street,
    tags["addr:suburb"] ?? tags["addr:barangay"] ?? tags["addr:district"],
    tags["addr:city"],
  ].filter((part): part is string => Boolean(part && part.trim()));
  const unique = parts.filter((part, i) => parts.findIndex((p) => p.toLowerCase() === part.toLowerCase()) === i);
  const address = unique.join(", ").slice(0, ADDRESS_MAX);
  // The database requires at least 5 characters
  return address.length >= 5 ? address : null;
}

/** OSM tags → the app's amenity list (only what OSM says explicitly). */
function parseAmenities(tags: Record<string, string>, isFree: boolean): Amenity[] {
  const amenities: Amenity[] = [];
  if (yes(tags.wheelchair)) amenities.push("wheelchair");
  if (yes(tags.changing_table) || yes(tags.diaper)) amenities.push("baby-changing");
  if (yes(tags["toilets:paper_supplied"])) amenities.push("tissue");
  if (yes(tags["toilets:handwashing"]) && yes(tags["toilets:handwashing:soap"])) amenities.push("soap");
  if (yes(tags.bidet) || yes(tags["toilets:bidet"])) amenities.push("bidet");
  if (yes(tags.shower)) amenities.push("shower");
  if (yes(tags.air_conditioning)) amenities.push("air-conditioned");
  if (isFree) amenities.push("free");
  return amenities;
}

function buildDescription(tags: Record<string, string>): string {
  const notes: string[] = [];
  if (tags.access === "customers") notes.push("Para sa customers lang.");
  if (tags.opening_hours) notes.push(`Oras: ${tags.opening_hours}.`);
  if (yes(tags.unisex)) notes.push("Unisex.");
  if (tags.fee === "yes" && tags.charge) notes.push(`Bayad: ${tags.charge}.`);
  notes.push("Mula sa OpenStreetMap.");
  return notes.join(" ").slice(0, DESCRIPTION_MAX);
}

/** One Overpass element → OsmRestroom, or null if it can't be used. */
export function parseElement(element: OverpassElement): OsmRestroom | null {
  if (element.type !== "node" && element.type !== "way" && element.type !== "relation") return null;
  const tags = element.tags ?? {};
  const latitude = element.lat ?? element.center?.lat;
  const longitude = element.lon ?? element.center?.lon;

  // Valid coordinates inside Metro Manila
  if (latitude === undefined || longitude === undefined) return null;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  const b = METRO_MANILA_BOUNDS;
  if (latitude < b.south || latitude > b.north || longitude < b.west || longitude > b.east) return null;

  // Not for the public (staff only, private homes, closed)
  if (["private", "no", "staff"].includes(tags.access ?? "")) return null;
  if (tags.disused === "yes" || tags["disused:amenity"]) return null;

  const rawName = (tags.name ?? tags["name:en"] ?? tags["name:tl"] ?? "").trim();
  const name = rawName.length >= 3 ? rawName.slice(0, NAME_MAX) : "Public CR";
  const isFree = tags.fee !== "yes";

  return {
    osmType: element.type,
    osmId: String(element.id),
    name,
    named: rawName.length >= 3,
    address: buildAddress(tags),
    latitude,
    longitude,
    amenities: parseAmenities(tags, isFree),
    isFree,
    description: buildDescription(tags),
  };
}

// Unicode combining accents U+0300–U+036F (built from char codes so the source stays ASCII)
const COMBINING_MARKS = new RegExp(`[${String.fromCharCode(0x300)}-${String.fromCharCode(0x36f)}]`, "g");

/** Normalized name for duplicate checks ("SM North EDSA CR" → "sm north edsa cr"). */
export function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(COMBINING_MARKS, "") // strip accents (é → e) after NFD
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Fetches and parses every amenity=toilets in Metro Manila.
 * Drops invalid/private ones and duplicates within OSM itself
 * (same name and within ~10 m — e.g. the same toilet mapped twice).
 */
export async function fetchOsmRestrooms(userAgent: string): Promise<OsmRestroom[]> {
  let json: unknown = null;
  const failures: string[] = [];
  // Up to 4 rounds over all servers, waiting 30 s between rounds
  for (let round = 0; round < 4 && json === null; round++) {
    if (round > 0) await new Promise((resolve) => setTimeout(resolve, 30_000));
    json = await tryServers(userAgent, failures);
  }
  if (json === null) throw new Error(`All Overpass servers failed (${failures.join("; ")}). Try again in a few minutes.`);

  const elements =
    typeof json === "object" && json !== null && "elements" in json && Array.isArray(json.elements)
      ? json.elements.filter(isOverpassElement)
      : [];

  const restrooms: OsmRestroom[] = [];
  for (const element of elements) {
    const parsed = parseElement(element);
    if (!parsed) continue;
    const duplicate = restrooms.some(
      (other) =>
        normalizeName(other.name) === normalizeName(parsed.name) &&
        distanceMeters(other.latitude, other.longitude, parsed.latitude, parsed.longitude) < 10
    );
    if (!duplicate) restrooms.push(parsed);
  }
  return restrooms;
}

/** One pass over the Overpass servers; the parsed JSON of the first that answers, or null. */
async function tryServers(userAgent: string, failures: string[]): Promise<unknown> {
  for (const url of OVERPASS_URLS) {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": userAgent },
        body: new URLSearchParams({ data: OVERPASS_QUERY }),
        signal: AbortSignal.timeout(180_000),
      });
      if (!response.ok) {
        failures.push(`${new URL(url).host}: HTTP ${response.status}`);
        continue;
      }
      // A busy server can answer 200 with an error page or a "remark" instead of data
      const json: unknown = await response.json();
      const remark =
        typeof json === "object" && json !== null && "remark" in json && typeof json.remark === "string"
          ? json.remark
          : "";
      if (/error/i.test(remark)) {
        failures.push(`${new URL(url).host}: ${remark.slice(0, 80)}`);
        continue;
      }
      return json;
    } catch (error) {
      failures.push(`${new URL(url).host}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  return null;
}

/** Haversine distance in meters. */
export function distanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6_371_000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
