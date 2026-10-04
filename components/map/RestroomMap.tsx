"use client";

import { useMemo } from "react";
import { CircleMarker, MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";

import { MapController, type MapTarget } from "@/components/map/MapController";
import { createRestroomIcon } from "@/components/map/marker-icon";
import { Button } from "@/components/ui/button";
import { RestroomRating } from "@/components/restroom/RestroomRating";
import { MANILA_COORDS } from "@/hooks/use-geolocation";
import type { Restroom } from "@/types/restroom";

interface RestroomMapProps {
  restrooms: Restroom[];
  onSelectRestroom: (restroom: Restroom) => void;
  /** When this changes (new object), the map flies to it. */
  flyTo: MapTarget | null;
  userLocation: { latitude: number; longitude: number } | null;
}

const DEFAULT_ZOOM = 12;

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
      <RestroomRating rating={restroom.rating} reviewCount={restroom.reviewCount} size="sm" />
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
