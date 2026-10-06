"use client";

import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { LocateFixed, Loader2, RefreshCw } from "lucide-react";

import type { MapTarget } from "@/components/map/MapController";
import { NearMeButton, type LocateResult } from "@/components/map/NearMeButton";
import type { UserLocation } from "@/components/map/UserLocationLayer";
import { NavigationPanel } from "@/components/navigation/NavigationPanel";
import { RestroomSheet } from "@/components/restroom/RestroomSheet";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useErrorToast } from "@/hooks/use-error-toast";
import { useNavigation, useNavigationGuidance } from "@/hooks/use-navigation";
import { useRestrooms } from "@/hooks/use-restrooms";
import { useWatchPosition } from "@/hooks/use-watch-position";
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
  const [nearMeLocation, setNearMeLocation] = useState<LocateResult | null>(null);

  // ---- navigation ----
  const nav = useNavigation();
  const tracking = nav.status === "navigating" || nav.status === "arrived";
  // GPS only runs while navigating (battery)
  const position = useWatchPosition({ enabled: tracking });
  const progress = useNavigationGuidance(nav, position);
  const [follow, setFollow] = useState(true);

  // Re-enable follow mode each time navigation starts
  useEffect(() => {
    if (nav.status === "navigating") setFollow(true);
  }, [nav.status]);

  useErrorToast(error, "Hindi makuha ang mga CR", retry);

  const handleSelectRestroom = useCallback((restroom: Restroom) => {
    setSelectedRestroom(restroom);
    setSheetOpen(true);
  }, []);

  const handleLocate = useCallback((result: LocateResult) => {
    // Only show the "you are here" dot for a real location, not the Manila fallback.
    setNearMeLocation(result.isFallback ? null : result);
    setFlyTo({
      latitude: result.latitude,
      longitude: result.longitude,
      zoom: result.isFallback ? 12 : 15,
    });
  }, []);

  const pauseFollow = useCallback(() => setFollow(false), []);

  // Blue dot: live GPS while navigating, route start in preview, otherwise "Near Me"
  const userLocation: UserLocation | null =
    tracking && position.latitude !== null && position.longitude !== null
      ? { latitude: position.latitude, longitude: position.longitude, accuracy: position.accuracy }
      : nav.status === "preview" && nav.origin
        ? nav.origin
        : nearMeLocation;

  const navActive = nav.status !== "idle";

  return (
    // `isolate` keeps Leaflet's high z-indexes (up to 1000) inside this box,
    // so the header, bottom nav, and sheet still render above the map.
    <div className="relative isolate flex-1">
      <RestroomMap
        restrooms={restrooms}
        onSelectRestroom={handleSelectRestroom}
        flyTo={flyTo}
        userLocation={userLocation}
        route={nav.route?.coordinates ?? null}
        fitRoute={nav.status === "preview"}
        followUser={tracking && follow}
        onUserPan={pauseFollow}
        // The navigation panel covers roughly the bottom 300px of the map
        bottomInset={navActive ? 300 : 0}
      />

      {!tracking && <NearMeButton onLocate={handleLocate} className="absolute right-3 top-3 z-[1000]" />}

      {/* Navigating but the user panned away: bring the map back to them */}
      {tracking && !follow && (
        <Button
          type="button"
          variant="secondary"
          onClick={() => setFollow(true)}
          className="absolute right-3 top-3 z-[1000] rounded-full bg-background shadow-lg hover:bg-muted"
        >
          <LocateFixed aria-hidden="true" />
          I-center
        </Button>
      )}

      {/* Status pill while pins load, or a retry button if loading failed */}
      {loading && !navActive && (
        <p
          role="status"
          className="absolute left-1/2 top-3 z-[1000] flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-background px-3 py-1.5 text-xs shadow-md"
        >
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
          Kinukuha ang mga CR...
        </p>
      )}
      {error && !navActive && (
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

      <NavigationPanel
        nav={nav}
        progress={progress}
        gpsError={position.error}
        gpsLoading={position.loading}
        onStart={nav.startNavigation}
        onStop={nav.stopNavigation}
        onRetry={nav.retryRoute}
        onProfileChange={nav.setProfile}
        onVoiceChange={nav.setVoiceEnabled}
        className="absolute inset-x-0 bottom-0 z-[1000]"
      />

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
