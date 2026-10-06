"use client";

import { useEffect, useMemo } from "react";
import L from "leaflet";
import { MapContainer, Marker, TileLayer, useMap } from "react-leaflet";

import { createRestroomIcon } from "@/components/map/marker-icon";
import { RouteLayer } from "@/components/map/RouteLayer";
import { UserLocationLayer } from "@/components/map/UserLocationLayer";
import type { LatLng } from "@/types/geo";

interface MiniMapProps {
  latitude: number;
  longitude: number;
  label: string;
  /** Route preview to draw (navigation) */
  route?: LatLng[] | null;
  /** Route start, shown as the blue dot */
  origin?: LatLng | null;
}

/**
 * Leaflet only measures its container on window resize. The mini map grows
 * when a route is shown, so re-measure whenever the container's size changes
 * (otherwise only part of the tiles render).
 */
function ResizeWatcher() {
  const map = useMap();
  useEffect(() => {
    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(map.getContainer());
    return () => observer.disconnect();
  }, [map]);
  return null;
}

/**
 * Small static-ish map showing one restroom. Dragging is off on touch devices
 * so swiping over the map scrolls the page instead of getting stuck panning.
 */
export default function MiniMap({ latitude, longitude, label, route = null, origin = null }: MiniMapProps) {
  const icon = useMemo(() => createRestroomIcon(), []);

  return (
    <MapContainer
      center={[latitude, longitude]}
      zoom={16}
      scrollWheelZoom={false}
      dragging={!L.Browser.mobile}
      className="h-full w-full"
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      <ResizeWatcher />
      {route && route.length > 1 && <RouteLayer coordinates={route} fit />}
      {origin && <UserLocationLayer location={origin} />}
      <Marker position={[latitude, longitude]} icon={icon} title={label} />
    </MapContainer>
  );
}
