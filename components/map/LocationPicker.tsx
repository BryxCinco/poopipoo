"use client";

import { useMemo, useRef } from "react";
import type L from "leaflet";
import { MapContainer, Marker, useMapEvents } from "react-leaflet";

import { BaseTileLayer } from "@/components/map/BaseTileLayer";
import { MapController, type MapTarget } from "@/components/map/MapController";
import { createRestroomIcon } from "@/components/map/marker-icon";
import { MANILA_COORDS } from "@/hooks/use-geolocation";

export interface LatLng {
  latitude: number;
  longitude: number;
}

interface LocationPickerProps {
  value: LatLng | null;
  onChange: (value: LatLng) => void;
  /** Fly here when it changes (e.g. after "Use my location"). */
  focus: MapTarget | null;
}

/** Tapping the map moves the pin there. */
function ClickToPlace({ onChange }: { onChange: (value: LatLng) => void }) {
  useMapEvents({
    click: (event) => onChange({ latitude: event.latlng.lat, longitude: event.latlng.lng }),
  });
  return null;
}

/** Map with a draggable pin. Client-only (load with `ssr: false`). */
export default function LocationPicker({ value, onChange, focus }: LocationPickerProps) {
  const icon = useMemo(() => createRestroomIcon(), []);
  const markerRef = useRef<L.Marker>(null);

  // Only used for the first render; later moves go through `focus`.
  const initialCenter: [number, number] = value
    ? [value.latitude, value.longitude]
    : [MANILA_COORDS.latitude, MANILA_COORDS.longitude];

  const markerHandlers = useMemo(
    () => ({
      dragend: () => {
        const position = markerRef.current?.getLatLng();
        if (position) onChange({ latitude: position.lat, longitude: position.lng });
      },
    }),
    [onChange]
  );

  return (
    <MapContainer center={initialCenter} zoom={value ? 17 : 12} className="h-full w-full">
      <BaseTileLayer />
      <ClickToPlace onChange={onChange} />
      <MapController target={focus} />
      {value && (
        <Marker
          ref={markerRef}
          position={[value.latitude, value.longitude]}
          icon={icon}
          draggable
          eventHandlers={markerHandlers}
          title="Lokasyon ng CR (i-drag para ilipat)"
        />
      )}
    </MapContainer>
  );
}
