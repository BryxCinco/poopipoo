import L from "leaflet";

import { TOILET_SVG } from "@/lib/icons";

// Leaflet's default marker images break with bundlers, so we use a divIcon
// (plain HTML) with the Lucide Toilet SVG inside. Tailwind picks up these
// classes because this file is inside /components.
// Only import this from client-only (ssr: false) map modules — Leaflet needs `window`.
export function createRestroomIcon(): L.DivIcon {
  return L.divIcon({
    className: "", // remove Leaflet's default white box
    html: `<div class="flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-primary text-primary-foreground shadow-md transition-transform duration-150 hover:scale-110">${TOILET_SVG}</div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -18],
  });
}
