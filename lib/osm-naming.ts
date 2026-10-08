import { distanceMeters, isGenericName, type OsmLandmark } from "@/lib/osm";

/**
 * Descriptive names for OpenStreetMap toilets that have no name of their own
 * (imported as "Public CR"). Used by scripts/import-osm.ts and
 * scripts/rename-osm-restrooms.ts.
 *
 * In order of preference:
 *   1. A nearby landmark from OSM      → "CR sa Rizal Park"
 *   2. The place in the address        → "CR sa Festival Walk"
 *   3. Street + barangay               → "CR sa Taft Avenue, Malate"
 *   4. Barangay + city / just the city → "CR sa Ermita, Manila"
 * Names that end up the same get the street (or a number) added.
 */

const NAME_MAX = 80;

// ---------- landmarks ----------

/**
 * How far (m) from a toilet each kind of place can be and still name it.
 * Big places are measured from their centre, so they get a bigger radius.
 */
const BIG_RADIUS: Record<string, number> = {
  mall: 300,
  department_store: 150,
  supermarket: 80,
  park: 350,
  garden: 200,
  stadium: 250,
  sports_centre: 150,
  university: 400,
  college: 250,
  school: 150,
  hospital: 200,
  station: 150,
  bus_station: 150,
  ferry_terminal: 250,
  airport: 800,
  marketplace: 150,
  townhall: 120,
  place_of_worship: 100,
  attraction: 150,
  museum: 120,
  viewpoint: 80,
};
const SMALL_RADIUS: Record<string, number> = {
  fuel: 50,
  fast_food: 30,
  restaurant: 30,
  cafe: 30,
  hotel: 40,
  library: 60,
  community_centre: 60,
  police: 50,
};
/**
 * Anything this close is almost surely where the toilet is (e.g. a gas
 * station's CR). Not food places: a park or mall toilet often has a food
 * stall right next to it, and the park/mall is the better name.
 */
const NEXT_TO_M = 25;
const FOOD = new Set(["fast_food", "restaurant", "cafe"]);
/** Landmark names that don't say which one it is ("Police Station") get the area added. */
const GENERIC_LANDMARK =
  /^(police station|police|church|chapel|mosque|school|park|playground|parking|market|public market|barangay hall|gas station|terminal|bus terminal|hospital|clinic|health center|library|plaza)$/i;

/** Picks the landmark that best describes where a toilet is, or null. */
export function pickLandmark(latitude: number, longitude: number, landmarks: OsmLandmark[]): OsmLandmark | null {
  const scored = landmarks
    .map((landmark) => ({
      landmark,
      meters: distanceMeters(latitude, longitude, landmark.latitude, landmark.longitude),
    }))
    .filter(({ meters }) => meters <= 800);

  const nextTo = scored
    .filter(({ landmark, meters }) => meters <= NEXT_TO_M && !FOOD.has(landmark.kind))
    .sort((a, b) => a.meters - b.meters)[0];
  if (nextTo) return nextTo.landmark;

  // Closest relative to how big that kind of place is
  const best = (radii: Record<string, number>) =>
    scored
      .filter(({ landmark, meters }) => radii[landmark.kind] !== undefined && meters <= radii[landmark.kind])
      .sort((a, b) => a.meters / radii[a.landmark.kind] - b.meters / radii[b.landmark.kind])[0]?.landmark ?? null;

  return best(BIG_RADIUS) ?? best(SMALL_RADIUS);
}

// ---------- addresses ----------

export interface AddressParts {
  place?: string;
  road?: string;
  area?: string;
  city?: string;
}

const ROAD =
  /\b(street|st\.?|avenue|ave\.?|road|rd\.?|highway|hwy|boulevard|blvd\.?|drive|dr\.?|lane|extension|ext\.?|expressway|bridge|circle|loop|greenway|way|alley|kalye|daan)$|^(lane|calle|street|road)\b/i;
// "Places" in addresses that say nothing useful about where the toilet is
const GENERIC_PLACE = /toilet|restroom|comfort room|\bcr\b|parking|drop-?off|tank|entrance|exit|^gate\b|^block\b/i;

const isRoad = (part: string) => ROAD.test(part.trim());

/**
 * Splits an address in this app's format ("Place, Road, Barangay, City" —
 * see lib/geocode.ts and buildAddress in lib/osm.ts, every part optional).
 */
export function parseAddress(address: string): AddressParts {
  const parts = address
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length === 0) return {};
  if (parts.length === 1) return isRoad(parts[0]) ? { road: parts[0] } : { city: parts[0] };

  const city = parts[parts.length - 1];
  const rest = parts.slice(0, -1);
  const result: AddressParts = { city };
  const roadIndex = rest.findIndex(isRoad);
  if (roadIndex >= 0) {
    result.road = rest[roadIndex];
    if (roadIndex > 0) result.place = rest[0];
    result.area = rest[roadIndex + 1];
  } else if (rest.length >= 2) {
    result.place = rest[0];
    result.area = rest[1];
  } else {
    result.area = rest[0];
  }
  // Nominatim often returns the toilet's own name ("Male Urinal") as the place
  if (result.place && (GENERIC_PLACE.test(result.place) || isGenericName(result.place))) delete result.place;
  // Nominatim sometimes gives a bare barangay number ("659")
  if (result.area && /^\d+$/.test(result.area)) result.area = `Barangay ${result.area}`;
  return result;
}

// ---------- names ----------

const clip = (name: string) => (name.length > NAME_MAX ? `${name.slice(0, NAME_MAX - 3).trimEnd()}...` : name);

/** "CR sa ..." for an unnamed toilet. */
export function describeRestroom(address: string, landmark: OsmLandmark | null): string {
  const { place, road, area, city } = parseAddress(address);
  if (landmark) {
    const where = GENERIC_LANDMARK.test(landmark.name.trim()) ? (area ?? road ?? city) : undefined;
    return clip(`CR sa ${[landmark.name, where].filter(Boolean).join(", ")}`);
  }
  if (place) return clip(`CR sa ${place}`);
  if (road) return clip(`CR sa ${[road, area ?? city].filter(Boolean).join(", ")}`);
  if (area) return clip(`CR sa ${[area, city].filter(Boolean).join(", ")}`);
  return clip(`CR sa ${city ?? "Pilipinas"}`);
}

/**
 * Makes `name` unique against `taken` (lowercased names already used):
 * first by adding the street or barangay in parentheses, then a number.
 * Adds the result to `taken`.
 */
export function uniqueName(name: string, address: string, taken: Set<string>): string {
  const candidates = [name];
  const { road, area } = parseAddress(address);
  const detail = road ?? area;
  if (detail && !name.includes(detail)) candidates.push(clip(`${name} (${detail})`));
  let chosen = candidates.find((candidate) => !taken.has(candidate.toLowerCase()));
  for (let n = 2; !chosen; n++) {
    const numbered = clip(`${candidates[candidates.length - 1]} #${n}`);
    if (!taken.has(numbered.toLowerCase())) chosen = numbered;
  }
  taken.add(chosen.toLowerCase());
  return chosen;
}

/**
 * True for names that still need a better one: generic OSM names ("Toilet",
 * "Public CR") and generated names built from one ("CR sa Male Urinal #2").
 */
export function needsDescriptiveName(name: string): boolean {
  if (isGenericName(name)) return true;
  if (!name.startsWith("CR sa ")) return false;
  const base = name.slice("CR sa ".length).replace(/ #\d+$/, "").replace(/ \([^)]*\)$/, "");
  return isGenericName(base);
}
