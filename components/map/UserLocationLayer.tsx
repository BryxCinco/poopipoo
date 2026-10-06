"use client";

import { useEffect } from "react";
import { Circle, CircleMarker, useMap, useMapEvents } from "react-leaflet";

export interface UserLocation {
  latitude: number;
  longitude: number;
  /** Meters; draws a faint accuracy circle when given */
  accuracy?: number | null;
}

interface UserLocationLayerProps {
  location: UserLocation;
  /** Keep the map centered on the user (navigation mode) */
  follow?: boolean;
  /** Called when the user drags the map, so follow mode can pause */
  onUserPan?: () => void;
  /**
   * Show the user this many px above the map's center while following, so the
   * road ahead stays visible above a bottom panel.
   */
  followOffsetY?: number;
}

const FOLLOW_ZOOM = 17;

/** Blue "you are here" dot, optional accuracy circle, and follow-the-user behaviour. */
export function UserLocationLayer({ location, follow = false, onUserPan, followOffsetY = 0 }: UserLocationLayerProps) {
  const map = useMap();
  const { latitude, longitude, accuracy } = location;

  useMapEvents({
    // Fired only for user drags, not for programmatic setView/flyTo
    dragstart: () => onUserPan?.(),
  });

  useEffect(() => {
    if (!follow) return;
    const zoom = Math.max(map.getZoom(), FOLLOW_ZOOM);
    // Center on a point below the user so the user appears higher on screen
    const center = map.unproject(map.project([latitude, longitude], zoom).add([0, followOffsetY]), zoom);
    map.setView(center, zoom, { animate: true });
  }, [follow, latitude, longitude, followOffsetY, map]);

  return (
    <>
      {accuracy && accuracy > 10 && (
        <Circle
          center={[latitude, longitude]}
          radius={accuracy}
          pathOptions={{ color: "#2563eb", weight: 1, fillColor: "#2563eb", fillOpacity: 0.1 }}
          interactive={false}
        />
      )}
      <CircleMarker
        center={[latitude, longitude]}
        radius={8}
        pathOptions={{ color: "#ffffff", weight: 3, fillColor: "#2563eb", fillOpacity: 1 }}
      />
    </>
  );
}
