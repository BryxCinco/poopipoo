/**
 * Reverse geocoding (coordinates → address) using OpenStreetMap Nominatim.
 * Free, no key. Usage policy: max ~1 request/second, so only call this on a
 * user action (e.g. finishing the location step), never on every map drag.
 * https://operations.osmfoundation.org/policies/nominatim/
 */

interface NominatimAddress {
  house_number?: string;
  road?: string;
  amenity?: string;
  building?: string;
  shop?: string;
  neighbourhood?: string;
  quarter?: string;
  suburb?: string;
  village?: string;
  city?: string;
  town?: string;
  municipality?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function pickString(record: Record<string, unknown>, key: keyof NominatimAddress): string | undefined {
  const value = record[key];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

/** Builds a short PH-style address ("Place, Road, Barangay, City") from Nominatim parts. */
function formatAddress(address: Record<string, unknown>): string {
  const get = (key: keyof NominatimAddress) => pickString(address, key);
  const place = get("amenity") ?? get("building") ?? get("shop");
  const road = [get("house_number"), get("road")].filter(Boolean).join(" ");
  const area = get("neighbourhood") ?? get("quarter") ?? get("suburb") ?? get("village");
  const city = get("city") ?? get("town") ?? get("municipality");

  // Drop empty and duplicate parts (e.g. suburb === city)
  return [place, road, area, city]
    .filter((part): part is string => Boolean(part))
    .filter((part, index, parts) => parts.indexOf(part) === index)
    .join(", ");
}

/** Returns a readable address, or null if it can't be found / the request fails. */
export async function reverseGeocode(
  latitude: number,
  longitude: number,
  signal?: AbortSignal,
  /** Scripts (Node) must identify themselves; browsers send their own User-Agent. */
  userAgent?: string
): Promise<string | null> {
  const url = new URL("https://nominatim.openstreetmap.org/reverse");
  url.search = new URLSearchParams({
    format: "jsonv2",
    lat: String(latitude),
    lon: String(longitude),
    zoom: "18",
    addressdetails: "1",
    // English street names are what most PH addresses and signs use
    "accept-language": "en",
  }).toString();

  try {
    const response = await fetch(url, {
      signal,
      headers: { Accept: "application/json", ...(userAgent ? { "User-Agent": userAgent } : {}) },
    });
    if (!response.ok) return null;

    const data: unknown = await response.json();
    if (!isRecord(data)) return null;

    const formatted = isRecord(data.address) ? formatAddress(data.address) : "";
    if (formatted) return formatted;
    return typeof data.display_name === "string" ? data.display_name : null;
  } catch {
    // Network error, aborted, or invalid JSON
    return null;
  }
}
