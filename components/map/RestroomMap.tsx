"use client";

import { useMemo } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";

import { MapController, type MapTarget } from "@/components/map/MapController";
import { createRestroomIcon } from "@/components/map/marker-icon";
import { RouteLayer } from "@/components/map/RouteLayer";
import { UserLocationLayer, type UserLocation } from "@/components/map/UserLocationLayer";
import { Button } from "@/components/ui/button";
import { RestroomRating } from "@/components/restroom/RestroomRating";
import { MANILA_COORDS } from "@/hooks/use-geolocation";
import type { LatLng } from "@/types/geo";
import type { Restroom } from "@/types/restroom";

interface RestroomMapProps {
  restrooms: Restroom[];
  onSelectRestroom: (restroom: Restroom) => void;
  /** When this changes (new object), the map flies to it. */
  flyTo: MapTarget | null;
  userLocation: UserLocation | null;
  /** Active navigation route to draw */
  route?: LatLng[] | null;
  /** Zoom to the whole route when it changes (preview) */
  fitRoute?: boolean;
  /** Keep the map centered on the user (navigating) */
  followUser?: boolean;
  /** User dragged the map (pauses follow mode) */
  onUserPan?: () => void;
  /** Height (px) of a panel covering the bottom of the map, so routes and the user stay visible */
  bottomInset?: number;
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
  route = null,
  fitRoute = false,
  followUser = false,
  onUserPan,
  bottomInset = 0,
}: RestroomMapProps) {
  const fitPadding = useMemo(() => ({ top: 70, bottom: bottomInset + 30 }), [bottomInset]);
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

      {route && route.length > 1 && <RouteLayer coordinates={route} fit={fitRoute} fitPadding={fitPadding} />}

      {userLocation && (
        <UserLocationLayer
          location={userLocation}
          follow={followUser}
          onUserPan={onUserPan}
          followOffsetY={bottomInset / 2}
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
