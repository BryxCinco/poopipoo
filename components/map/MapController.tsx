"use client";

import { useEffect } from "react";
import { useMap } from "react-leaflet";

export interface MapTarget {
  latitude: number;
  longitude: number;
  zoom: number;
}

/**
 * Imperatively moves the map when `target` changes (pass a new object each time).
 * Must be rendered inside a react-leaflet MapContainer.
 */
export function MapController({ target }: { target: MapTarget | null }) {
  const map = useMap();

  useEffect(() => {
    if (target) {
      map.flyTo([target.latitude, target.longitude], target.zoom, { duration: 1 });
    }
  }, [map, target]);

  return null;
}
