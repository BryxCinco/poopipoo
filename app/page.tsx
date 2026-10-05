"use client";

import { useCallback, useState } from "react";
import dynamic from "next/dynamic";
import { Loader2, RefreshCw } from "lucide-react";

import type { MapTarget } from "@/components/map/MapController";
import { NearMeButton, type LocateResult } from "@/components/map/NearMeButton";
import { RestroomSheet } from "@/components/restroom/RestroomSheet";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useErrorToast } from "@/hooks/use-error-toast";
import { useRestrooms } from "@/hooks/use-restrooms";
import type { Restroom } from "@/types/restroom";

// Leaflet touches `window` on import, so the map must only load in the browser.
const RestroomMap = dynamic(() => import("@/components/map/RestroomMap"), {
  ssr: false,
  loading: () => <Skeleton className="h-full w-full rounded-none" />,
});

export default function HomePage() {
  const { restrooms, isUserAdded, loading, error, retry } = useRestrooms();
  const [selectedRestroom, setSelectedRestroom] = useState<Restroom | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [flyTo, setFlyTo] = useState<MapTarget | null>(null);
  const [userLocation, setUserLocation] = useState<LocateResult | null>(null);

  useErrorToast(error, "Hindi makuha ang mga CR", retry);

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
        restrooms={restrooms}
        onSelectRestroom={handleSelectRestroom}
        flyTo={flyTo}
        userLocation={userLocation}
      />

      <NearMeButton onLocate={handleLocate} className="absolute right-3 top-3 z-[1000]" />

      {/* Status pill while pins load, or a retry button if loading failed */}
      {loading && (
        <p
          role="status"
          className="absolute left-1/2 top-3 z-[1000] flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-background px-3 py-1.5 text-xs shadow-md"
        >
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
          Kinukuha ang mga CR...
        </p>
      )}
      {error && (
        <Button
          type="button"
          size="sm"
          variant="destructive"
          onClick={() => void retry()}
          className="absolute bottom-8 left-1/2 z-[1000] -translate-x-1/2 rounded-full shadow-lg"
        >
          <RefreshCw aria-hidden="true" />
          Hindi makuha ang mga CR. Subukan ulit
        </Button>
      )}

      {/* Keeps the last restroom while closing so the slide-out animation still has content */}
      <RestroomSheet
        restroom={selectedRestroom}
        isUserAdded={selectedRestroom ? isUserAdded(selectedRestroom) : false}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />
    </div>
  );
}
