"use client";

import { useEffect } from "react";
import { useMap } from "react-leaflet";

export interface MapTarget {
  latitude: number;
  longitude: number;
  zoom: number;
  /** Keep the target this many px left of the map's center (a panel covers the right side) */
  offsetX?: number;
}

/**
 * Imperatively moves the map when `target` changes (pass a new object each time).
 * Must be rendered inside a react-leaflet MapContainer.
 */
export function MapController({ target }: { target: MapTarget | null }) {
  const map = useMap();

  useEffect(() => {
    if (target) {
      const point = map.project([target.latitude, target.longitude], target.zoom).add([target.offsetX ?? 0, 0]);
      map.flyTo(map.unproject(point, target.zoom), target.zoom, { duration: 1 });
    }
  }, [map, target]);

  return null;
}
