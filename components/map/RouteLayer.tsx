"use client";

import { useEffect, useMemo } from "react";
import L from "leaflet";
import { Polyline, useMap } from "react-leaflet";

import { useTheme } from "@/hooks/use-theme";
import type { LatLng } from "@/types/geo";

interface RouteLayerProps {
  coordinates: LatLng[];
  /** Zoom the map to show the whole route whenever the route changes */
  fit?: boolean;
  /** Extra space (px) at the top/bottom when fitting, e.g. for a panel covering the map */
  fitPadding?: { top: number; bottom: number };
}

const DEFAULT_PADDING = { top: 50, bottom: 50 };

// Leaflet sets SVG attributes, which can't read CSS variables, so the theme
// colors are repeated here (primary brown; lighter brown on dark tiles).
const COLORS = {
  light: { casing: "#ffffff", line: "#8B4513" },
  dark: { casing: "#1C1917", line: "#E0904F" },
} as const;

/** Route line (brown with a white casing so it stands out on any map background). */
export function RouteLayer({ coordinates, fit = false, fitPadding = DEFAULT_PADDING }: RouteLayerProps) {
  const map = useMap();
  const { resolved } = useTheme();
  const colors = COLORS[resolved];
  const positions = useMemo<[number, number][]>(
    () => coordinates.map(({ latitude, longitude }) => [latitude, longitude]),
    [coordinates]
  );

  useEffect(() => {
    if (!fit || positions.length < 2) return;
    map.fitBounds(L.latLngBounds(positions), {
      paddingTopLeft: [40, fitPadding.top],
      paddingBottomRight: [40, fitPadding.bottom],
      maxZoom: 17,
    });
  }, [fit, positions, map, fitPadding.top, fitPadding.bottom]);

  return (
    <>
      <Polyline positions={positions} pathOptions={{ color: colors.casing, weight: 8, opacity: 0.9 }} />
      <Polyline positions={positions} pathOptions={{ color: colors.line, weight: 5, opacity: 0.95 }} />
    </>
  );
}
