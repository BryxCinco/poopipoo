"use client";

import { useCallback, useState } from "react";
import dynamic from "next/dynamic";

import type { MapTarget } from "@/components/map/RestroomMap";
import { NearMeButton, type LocateResult } from "@/components/map/NearMeButton";
import { RestroomSheet } from "@/components/restroom/RestroomSheet";
import { Skeleton } from "@/components/ui/skeleton";
import { MOCK_RESTROOMS } from "@/lib/mock-restrooms";
import type { Restroom } from "@/types/restroom";

// Leaflet touches `window` on import, so the map must only load in the browser.
const RestroomMap = dynamic(() => import("@/components/map/RestroomMap"), {
  ssr: false,
  loading: () => <Skeleton className="h-full w-full rounded-none" />,
});

export default function HomePage() {
  const [selectedRestroom, setSelectedRestroom] = useState<Restroom | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [flyTo, setFlyTo] = useState<MapTarget | null>(null);
  const [userLocation, setUserLocation] = useState<LocateResult | null>(null);

  const handleSelectRestroom = useCallback((restroom: Restroom) => {
    setSelectedRestroom(restroom);
    setSheetOpen(true);
  }, []);

  const handleLocate = useCallback((result: LocateResult) => {
    // Only show the "you are here" dot for a real location, not the Manila fallback.
    setUserLocation(result.isFallback ? null : result);
    setFlyTo({
      latitude: result.latitude,
      longitude: result.longitude,
      zoom: result.isFallback ? 12 : 15,
    });
  }, []);

  return (
    // `isolate` keeps Leaflet's high z-indexes (up to 1000) inside this box,
    // so the header, bottom nav, and sheet still render above the map.
    <div className="relative isolate flex-1">
      <RestroomMap
        restrooms={MOCK_RESTROOMS}
        onSelectRestroom={handleSelectRestroom}
        flyTo={flyTo}
        userLocation={userLocation}
      />

      <NearMeButton onLocate={handleLocate} className="absolute right-3 top-3 z-[1000]" />

      {/* Keeps the last restroom while closing so the slide-out animation still has content */}
      <RestroomSheet
        restroom={selectedRestroom}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />
    </div>
  );
}
