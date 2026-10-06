"use client";

import { useEffect } from "react";
import { TileLayer, useMap } from "react-leaflet";

import { useTheme } from "@/hooks/use-theme";

/**
 * Map tiles for every map in the app.
 *
 * CARTO basemaps (free key, no payment): Voyager in light mode, Dark Matter in
 * dark mode. CARTO now requires a key (?key=...) or tiles show an
 * "API key required" watermark. The key is public by design (it's in every
 * tile URL the browser loads), hence NEXT_PUBLIC_.
 *
 * Without a key, falls back to standard OpenStreetMap tiles (darkened with a
 * CSS filter in dark mode, see globals.css) so the map never shows a watermark.
 * `{r}` loads @2x tiles on high-DPI screens so labels stay sharp on phones.
 */
const CARTO_KEY = process.env.NEXT_PUBLIC_CARTO_API_KEY;

const CARTO_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';
const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

const CARTO_TILES = {
  light: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
  dark: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
} as const;

export function BaseTileLayer() {
  const { resolved } = useTheme();
  const map = useMap();

  // Shorter attribution on small screens: drop Leaflet's "Leaflet" prefix,
  // keep the required OpenStreetMap/CARTO credits.
  useEffect(() => {
    map.attributionControl?.setPrefix(false);
  }, [map]);

  if (!CARTO_KEY) {
    return (
      <TileLayer
        // TileLayer props aren't reactive in react-leaflet v4; a new key swaps the layer
        key={`osm-${resolved}`}
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution={OSM_ATTRIBUTION}
        className={resolved === "dark" ? "map-tiles-dark" : undefined}
        maxZoom={19}
      />
    );
  }

  return (
    <TileLayer
      key={`carto-${resolved}`}
      url={`${CARTO_TILES[resolved]}?key=${encodeURIComponent(CARTO_KEY)}`}
      attribution={CARTO_ATTRIBUTION}
      subdomains={["a", "b", "c", "d"]}
      maxZoom={20}
    />
  );
}
