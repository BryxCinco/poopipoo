"use client";

import { useMemo } from "react";
import L from "leaflet";
import { MapContainer, Marker, TileLayer } from "react-leaflet";

import { createRestroomIcon } from "@/components/map/marker-icon";

interface MiniMapProps {
  latitude: number;
  longitude: number;
  label: string;
}

/**
 * Small static-ish map showing one restroom. Dragging is off on touch devices
 * so swiping over the map scrolls the page instead of getting stuck panning.
 */
export default function MiniMap({ latitude, longitude, label }: MiniMapProps) {
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
      <Marker position={[latitude, longitude]} icon={icon} title={label} />
    </MapContainer>
  );
}
