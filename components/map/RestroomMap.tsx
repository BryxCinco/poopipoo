"use client";

import { useEffect, useMemo } from "react";
import { MapContainer, useMap, useMapEvents } from "react-leaflet";

import { BaseTileLayer } from "@/components/map/BaseTileLayer";
import { ClusteredMarkers } from "@/components/map/ClusteredMarkers";
import { MapController, type MapTarget } from "@/components/map/MapController";
import { createRestroomIcon } from "@/components/map/marker-icon";
import { RouteLayer } from "@/components/map/RouteLayer";
import { UserLocationLayer, type UserLocation } from "@/components/map/UserLocationLayer";
import { Button } from "@/components/ui/button";
import { RestroomRating } from "@/components/restroom/RestroomRating";
import { MANILA_COORDS } from "@/hooks/use-geolocation";
import { useI18n } from "@/hooks/use-i18n";
import { ensureRestroomsInBounds } from "@/lib/restroom-store";
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

// Wait for the map to settle before fetching (flyTo and quick pans fire several moveends)
const FETCH_DEBOUNCE_MS = 300;
// Fetch a bit beyond the edges so small pans don't need a new request
const FETCH_PAD = 0.25;

interface RestroomPopupContentProps {
  restroom: Restroom;
  onSelectRestroom: (restroom: Restroom) => void;
}

/** Popup body. Closes the popup when opening details so it doesn't linger over the map. */
function RestroomPopupContent({ restroom, onSelectRestroom }: RestroomPopupContentProps) {
  const map = useMap();
  const { t } = useI18n();

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
        {t.map.viewDetails}
      </Button>
    </div>
  );
}

/**
 * Loads the restrooms in view: on mount and after every pan/zoom (moveend).
 * The store skips the request when the loaded area already covers the view.
 */
function RestroomBoundsLoader() {
  const map = useMap();

  const load = useMemo(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const run = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        const bounds = map.getBounds().pad(FETCH_PAD);
        ensureRestroomsInBounds({
          south: bounds.getSouth(),
          west: bounds.getWest(),
          north: bounds.getNorth(),
          east: bounds.getEast(),
        });
      }, FETCH_DEBOUNCE_MS);
    };
    return { run, cancel: () => clearTimeout(timer) };
  }, [map]);

  useMapEvents({ moveend: load.run });
  useEffect(() => {
    load.run();
    return load.cancel;
  }, [load]);

  return null;
}

/**
 * On the full-screen map the bottom-right has the AI button and the raised Add
 * button overlaps the bottom edge, so the attribution goes bottom-left and is
 * lifted a little (see .restroom-map in globals.css). It must stay visible.
 */
function AttributionBottomLeft() {
  const map = useMap();
  useEffect(() => {
    map.attributionControl?.setPosition("bottomleft");
  }, [map]);
  return null;
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
      className="restroom-map h-full w-full"
    >
      <BaseTileLayer />
      <AttributionBottomLeft />

      <MapController target={flyTo} />
      <RestroomBoundsLoader />

      {route && route.length > 1 && <RouteLayer coordinates={route} fit={fitRoute} fitPadding={fitPadding} />}

      {userLocation && (
        <UserLocationLayer
          location={userLocation}
          follow={followUser}
          onUserPan={onUserPan}
          followOffsetY={bottomInset / 2}
        />
      )}

      {/* Grouped into count bubbles when zoomed out (hundreds of OSM restrooms) */}
      <ClusteredMarkers
        restrooms={restrooms}
        restroomIcon={restroomIcon}
        renderPopup={(restroom) => <RestroomPopupContent restroom={restroom} onSelectRestroom={onSelectRestroom} />}
      />
    </MapContainer>
  );
}
