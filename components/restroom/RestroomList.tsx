"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { CloudOff, Loader2, LocateOff, Plus, RefreshCw, SearchX, Toilet } from "lucide-react";

import {
  applyFilters,
  RestroomFilters,
  type FilterId,
} from "@/components/restroom/RestroomFilters";
import { RestroomListItem } from "@/components/restroom/RestroomListItem";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { useErrorToast } from "@/hooks/use-error-toast";
import { useGeolocation } from "@/hooks/use-geolocation";
import { useRestrooms } from "@/hooks/use-restrooms";
import { staggerItemCapped } from "@/lib/animations";
import { calculateDistance } from "@/lib/distance";
import type { Restroom } from "@/types/restroom";

interface RestroomWithDistance {
  restroom: Restroom;
  distanceKm: number | null;
}

export function RestroomList() {
  const {
    restrooms,
    isUserAdded,
    loading: dataLoading,
    error: dataError,
    retry,
  } = useRestrooms();
  const {
    latitude,
    longitude,
    hasLocation,
    loading: locationLoading,
    error: locationError,
    requestLocation,
  } = useGeolocation({ requestOnMount: true });
  const [activeFilters, setActiveFilters] = useState<FilterId[]>([]);

  useErrorToast(dataError, "Hindi makuha ang mga CR", retry);

  // Wait for the location too, so the list doesn't reorder right after appearing.
  const loading = dataLoading || locationLoading;

  // Filter, then sort: nearest first when we know where the user is,
  // otherwise highest rating first.
  const items = useMemo<RestroomWithDistance[]>(() => {
    const withDistance = applyFilters(restrooms, activeFilters).map((restroom) => ({
      restroom,
      distanceKm: hasLocation
        ? calculateDistance(latitude, longitude, restroom.latitude, restroom.longitude)
        : null,
    }));

    return withDistance.sort((a, b) =>
      a.distanceKm !== null && b.distanceKm !== null
        ? a.distanceKm - b.distanceKm
        : b.restroom.rating - a.restroom.rating
    );
  }, [restrooms, activeFilters, hasLocation, latitude, longitude]);

  return (
    <div className="flex flex-col gap-3">
      <RestroomFilters active={activeFilters} onChange={setActiveFilters} />

      {locationLoading ? (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground" role="status">
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
          Kinukuha ang iyong location...
        </p>
      ) : !hasLocation ? (
        <div className="flex items-center justify-between gap-2 rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <LocateOff className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            {locationError ?? "Walang location."} Naka-sort ayon sa rating.
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => void requestLocation()}
            className="h-7 shrink-0 px-2 text-xs"
          >
            <RefreshCw aria-hidden="true" />
            Subukan ulit
          </Button>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">Naka-sort mula sa pinakamalapit.</p>
      )}

      {dataError && restrooms.length === 0 ? (
        // Error with nothing cached: full error state with retry
        <EmptyState
          icon={<CloudOff />}
          tone="error"
          role="alert"
          title="Hindi makuha ang mga CR"
          description="I-check ang internet connection mo."
          action={
            <Button variant="outline" size="sm" onClick={() => void retry()}>
              <RefreshCw aria-hidden="true" />
              Subukan ulit
            </Button>
          }
        />
      ) : loading ? (
        <ul className="flex flex-col gap-2" aria-busy="true" aria-label="Naglo-load">
          {Array.from({ length: 4 }, (_, i) => (
            <li key={i}>
              <Skeleton className="h-[104px] w-full" />
            </li>
          ))}
        </ul>
      ) : restrooms.length === 0 ? (
        <EmptyState
          icon={<Toilet />}
          title="Wala pang CR dito. Mag-add ka!"
          description="Ikaw ang unang tumulong sa komunidad."
          action={
            <Button asChild size="sm">
              <Link href="/add">
                <Plus aria-hidden="true" />
                Magdagdag ng CR
              </Link>
            </Button>
          }
        />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<SearchX />}
          title="Walang CR na tugma"
          description="Subukang bawasan ang mga filter."
          action={
            <Button variant="outline" size="sm" onClick={() => setActiveFilters([])}>
              Clear all filters
            </Button>
          }
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map(({ restroom, distanceKm }, index) => (
            // Staggered entrance (capped so long lists appear quickly); items shown by a filter change animate in too
            <motion.li key={restroom.id} custom={index} variants={staggerItemCapped} initial="hidden" animate="visible">
              <RestroomListItem
                restroom={restroom}
                distanceKm={distanceKm}
                isUserAdded={isUserAdded(restroom)}
              />
            </motion.li>
          ))}
        </ul>
      )}
    </div>
  );
}
