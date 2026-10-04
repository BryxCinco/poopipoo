"use client";

import { useEffect, useMemo } from "react";
import L from "leaflet";
import { CircleMarker, MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";

import { Button } from "@/components/ui/button";
import { StarRating } from "@/components/restroom/StarRating";
import { MANILA_COORDS } from "@/hooks/use-geolocation";
import type { Restroom } from "@/types/restroom";

export interface MapTarget {
  latitude: number;
  longitude: number;
  zoom: number;
}

interface RestroomMapProps {
  restrooms: Restroom[];
  onSelectRestroom: (restroom: Restroom) => void;
  /** When this changes (new object), the map flies to it. */
  flyTo: MapTarget | null;
  userLocation: { latitude: number; longitude: number } | null;
}

const DEFAULT_ZOOM = 12;

// Leaflet's default marker images break with bundlers, so we use a divIcon
// (plain HTML) styled with Tailwind. These classes are picked up by Tailwind
// because this file is inside /components.
function createRestroomIcon(): L.DivIcon {
  return L.divIcon({
    className: "", // remove Leaflet's default white box
    html: `<div class="flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-[#8B4513] text-lg shadow-md">🚽</div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -18],
  });
}

/** Imperatively moves the map when `target` changes. Must be inside MapContainer. */
function MapController({ target }: { target: MapTarget | null }) {
  const map = useMap();

  useEffect(() => {
    if (target) {
      map.flyTo([target.latitude, target.longitude], target.zoom, { duration: 1 });
    }
  }, [map, target]);

  return null;
}

interface RestroomPopupContentProps {
  restroom: Restroom;
  onSelectRestroom: (restroom: Restroom) => void;
}

/** Popup body. Closes the popup when opening details so it doesn't linger over the map. */
function RestroomPopupContent({ restroom, onSelectRestroom }: RestroomPopupContentProps) {
  const map = useMap();

  const handleViewDetails = () => {
    map.closePopup();
    onSelectRestroom(restroom);
  };

  return (
    <div className="flex min-w-[180px] flex-col gap-1.5">
      <p className="!m-0 text-sm font-semibold">{restroom.name}</p>
      <div className="flex items-center gap-1.5">
        <StarRating rating={restroom.rating} />
        <span className="text-xs text-muted-foreground">{restroom.rating.toFixed(1)}</span>
      </div>
      <p className="!m-0 text-xs text-muted-foreground">{restroom.address}</p>
      <Button size="sm" className="mt-1" onClick={handleViewDetails}>
        View details
      </Button>
    </div>
  );
}

export default function RestroomMap({
  restrooms,
  onSelectRestroom,
  flyTo,
  userLocation,
}: RestroomMapProps) {
  const restroomIcon = useMemo(() => createRestroomIcon(), []);

  return (
    <MapContainer
      center={[MANILA_COORDS.latitude, MANILA_COORDS.longitude]}
      zoom={DEFAULT_ZOOM}
      className="h-full w-full"
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />

      <MapController target={flyTo} />

      {userLocation && (
        <CircleMarker
          center={[userLocation.latitude, userLocation.longitude]}
          radius={8}
          pathOptions={{ color: "#ffffff", weight: 2, fillColor: "#2563eb", fillOpacity: 1 }}
        />
      )}

      {restrooms.map((restroom) => (
        <Marker
          key={restroom.id}
          position={[restroom.latitude, restroom.longitude]}
          icon={restroomIcon}
          title={restroom.name}
        >
          <Popup>
            <RestroomPopupContent restroom={restroom} onSelectRestroom={onSelectRestroom} />
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
