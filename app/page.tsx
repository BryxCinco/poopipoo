"use client";

import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "framer-motion";
import { LocateFixed, Loader2, RefreshCw, Sparkles } from "lucide-react";

import type { MapTarget } from "@/components/map/MapController";
import { NearMeButton, type LocateResult } from "@/components/map/NearMeButton";
import { SearchBar } from "@/components/map/SearchBar";
import type { UserLocation } from "@/components/map/UserLocationLayer";
import { NavigationPanel } from "@/components/navigation/NavigationPanel";
import { Onboarding } from "@/components/onboarding/Onboarding";
import { RestroomSheet } from "@/components/restroom/RestroomSheet";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAgentEnabled } from "@/hooks/use-agent-enabled";
import { useErrorToast } from "@/hooks/use-error-toast";
import { useI18n } from "@/hooks/use-i18n";
import { useNavigation, useNavigationGuidance } from "@/hooks/use-navigation";
import { useRestrooms } from "@/hooks/use-restrooms";
import { useWatchPosition } from "@/hooks/use-watch-position";
import { fadeIn, scaleIn, SPRING, tapScale } from "@/lib/animations";
import type { SearchResult } from "@/lib/search";
import type { Restroom } from "@/types/restroom";

// Leaflet touches `window` on import, so the map must only load in the browser.
const RestroomMap = dynamic(() => import("@/components/map/RestroomMap"), {
  ssr: false,
  loading: () => <Skeleton className="h-full w-full rounded-none" />,
});

// The AI chat (and its markdown/message code) only downloads when first opened
const AgentChat = dynamic(() => import("@/components/agent/AgentChat").then((m) => m.AgentChat), { ssr: false });

export default function HomePage() {
  const { restrooms, isUserAdded, loading, error, retry } = useRestrooms();
  const [selectedRestroom, setSelectedRestroom] = useState<Restroom | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [flyTo, setFlyTo] = useState<MapTarget | null>(null);
  const [nearMeLocation, setNearMeLocation] = useState<LocateResult | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  // Stays true after the first open, so closing keeps the conversation and exit animation
  const [chatLoaded, setChatLoaded] = useState(false);
  useEffect(() => {
    if (chatOpen) setChatLoaded(true);
  }, [chatOpen]);
  const [agentEnabled] = useAgentEnabled();
  const { t } = useI18n();

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

  useErrorToast(error, t.home.loadError, retry);

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

  // Place search: fly to the picked place (close enough to see nearby CR pins)
  const handleSearchSelect = useCallback((result: SearchResult) => {
    setFlyTo({ latitude: result.lat, longitude: result.lon, zoom: 16 });
  }, []);

  // Blue dot: live GPS while navigating, route start in preview, otherwise "Near Me"
  const userLocation: UserLocation | null =
    tracking && position.latitude !== null && position.longitude !== null
      ? { latitude: position.latitude, longitude: position.longitude, accuracy: position.accuracy }
      : nav.status === "preview" && nav.origin
        ? nav.origin
        : nearMeLocation;

  const navActive = nav.status !== "idle";
  // Controls below the search bar move up when it's hidden (during navigation)
  const belowSearch = navActive ? "top-3" : "top-[4.75rem]";

  return (
    // `isolate` keeps Leaflet's high z-indexes (up to 1000) inside this box,
    // so the header, bottom nav, and sheet still render above the map.
    // overflow-hidden: nothing on the map (e.g. the AI button glow) can widen the page
    // map-search-visible: moves the zoom buttons below the search bar (globals.css)
    <div className={`relative isolate flex-1 overflow-hidden ${navActive ? "" : "map-search-visible"}`}>
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

      {/* Place search (Nominatim). Hidden during navigation. */}
      <AnimatePresence>
        {!navActive && (
          <motion.div
            key="search"
            variants={fadeIn}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="absolute left-4 right-4 top-4 z-[1001]"
          >
            <SearchBar onSelect={handleSearchSelect} />
          </motion.div>
        )}
      </AnimatePresence>

      {!tracking && <NearMeButton onLocate={handleLocate} className={`absolute right-4 z-[1000] ${belowSearch}`} />}

      {/* Navigating but the user panned away: bring the map back to them */}
      {tracking && !follow && (
        <Button
          type="button"
          variant="secondary"
          onClick={() => setFollow(true)}
          className="absolute right-3 top-3 z-[1000] rounded-full bg-background shadow-lg hover:bg-muted"
        >
          <LocateFixed aria-hidden="true" />
          {t.home.recenter}
        </Button>
      )}

      {/* Status pill while pins load, or a retry button if loading failed */}
      {loading && !navActive && (
        <p
          role="status"
          className="absolute left-14 top-[4.75rem] z-[1000] flex items-center gap-1.5 rounded-full bg-background px-3 py-1.5 text-xs shadow-md"
        >
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
          <span className="animate-pulse">{t.home.loadingPins}</span>
        </p>
      )}
      {error && !navActive && (
        <Button
          type="button"
          size="sm"
          variant="destructive"
          onClick={() => void retry()}
          // Sits above the AI button when that is shown
          className={`absolute left-1/2 z-[1000] -translate-x-1/2 rounded-full shadow-lg ${agentEnabled ? "bottom-24" : "bottom-8"}`}
        >
          <RefreshCw aria-hidden="true" />
          {t.home.loadErrorRetry}
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

      {/* AI assistant: hidden during navigation, or when turned off in Profile */}
      <AnimatePresence>
        {agentEnabled && !navActive && (
          <motion.div
            key="agent-fab"
            variants={scaleIn}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="absolute bottom-6 right-3 z-[1000]"
          >
            <Tooltip>
              <TooltipTrigger asChild>
                <motion.button
                  type="button"
                  onClick={() => setChatOpen(true)}
                  aria-label={t.home.openAssistant}
                  whileHover={{ scale: 1.05 }}
                  whileTap={tapScale}
                  transition={SPRING}
                  className="group relative flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-shadow hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  {/* Soft pulse ring to draw attention (off with reduced motion) */}
                  <span className="absolute inset-0 animate-pulse-ring rounded-full bg-primary" aria-hidden="true" />
                  <Sparkles
                    className="relative h-6 w-6 transition-transform duration-200 group-hover:rotate-12 group-hover:scale-110"
                    aria-hidden="true"
                  />
                </motion.button>
              </TooltipTrigger>
              <TooltipContent side="left">{t.home.assistant}</TooltipContent>
            </Tooltip>
          </motion.div>
        )}
      </AnimatePresence>
      {chatLoaded && <AgentChat open={chatOpen} onOpenChange={setChatOpen} />}

      {/* Keeps the last restroom while closing so the slide-out animation still has content */}
      <RestroomSheet
        restroom={selectedRestroom}
        isUserAdded={selectedRestroom ? isUserAdded(selectedRestroom) : false}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />

      {/* First visit only: short intro slides */}
      <Onboarding />
    </div>
  );
}
