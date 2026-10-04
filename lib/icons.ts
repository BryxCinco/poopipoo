import {
  Accessibility,
  Baby,
  BadgeCheck,
  Droplets,
  ScrollText,
  ShowerHead,
  Snowflake,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

import type { Amenity } from "@/types/restroom";

const AMENITY_ICONS: Record<Amenity, LucideIcon> = {
  bidet: Droplets,
  tissue: ScrollText,
  soap: Sparkles,
  wheelchair: Accessibility,
  "baby-changing": Baby,
  shower: ShowerHead,
  "air-conditioned": Snowflake,
  free: BadgeCheck,
};

// Filipino (or common Taglish) labels shown in the UI.
const AMENITY_LABELS: Record<Amenity, string> = {
  bidet: "Bidet",
  tissue: "Tissue",
  soap: "Sabon",
  wheelchair: "PWD accessible",
  "baby-changing": "Palitan ng diaper",
  shower: "Shower",
  "air-conditioned": "Aircon",
  free: "Libre",
};

/** Every amenity type, in display order. */
export const ALL_AMENITIES: Amenity[] = [
  "bidet",
  "tissue",
  "soap",
  "wheelchair",
  "baby-changing",
  "shower",
  "air-conditioned",
  "free",
];

/**
 * Amenities to show as badges/grid items. "free" is skipped because the
 * Libre / May bayad price badge (from `isFree`) already covers it, and showing
 * both could contradict each other.
 */
export function getDisplayAmenities(amenities: Amenity[]): Amenity[] {
  return amenities.filter((amenity) => amenity !== "free");
}

export function getAmenityIcon(amenity: Amenity): LucideIcon {
  return AMENITY_ICONS[amenity];
}

export function getAmenityLabel(amenity: Amenity): string {
  return AMENITY_LABELS[amenity];
}

/**
 * Lucide "Toilet" icon as a raw SVG string, for places that need HTML instead of
 * a React component (e.g. Leaflet `divIcon`). Path data copied from lucide-react;
 * update it here if lucide changes the icon.
 */
export const TOILET_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 12h13a1 1 0 0 1 1 1 5 5 0 0 1-5 5h-.598a.5.5 0 0 0-.424.765l1.544 2.47a.5.5 0 0 1-.424.765H5.402a.5.5 0 0 1-.424-.765L7 18"/><path d="M8 18a5 5 0 0 1-5-5V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8"/></svg>`;
