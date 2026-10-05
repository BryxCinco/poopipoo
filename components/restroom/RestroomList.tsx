"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CloudOff, Loader2, LocateOff, Plus, RefreshCw, SearchX, Toilet } from "lucide-react";

import {
  applyFilters,
  RestroomFilters,
  type FilterId,
} from "@/components/restroom/RestroomFilters";
import { RestroomListItem } from "@/components/restroom/RestroomListItem";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useErrorToast } from "@/hooks/use-error-toast";
import { useGeolocation } from "@/hooks/use-geolocation";
import { useRestrooms } from "@/hooks/use-restrooms";
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
        <div className="flex flex-col items-center gap-2 py-12 text-center text-muted-foreground" role="alert">
          <CloudOff className="h-10 w-10" aria-hidden="true" />
          <p className="font-medium text-foreground">Hindi makuha ang mga CR</p>
          <p className="text-sm">I-check ang internet connection mo.</p>
          <Button variant="outline" size="sm" className="mt-2" onClick={() => void retry()}>
            <RefreshCw aria-hidden="true" />
            Subukan ulit
          </Button>
        </div>
      ) : loading ? (
        <ul className="flex flex-col gap-2" aria-busy="true" aria-label="Naglo-load">
          {Array.from({ length: 4 }, (_, i) => (
            <li key={i}>
              <Skeleton className="h-[104px] w-full" />
            </li>
          ))}
        </ul>
      ) : restrooms.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-12 text-center text-muted-foreground">
          <Toilet className="h-10 w-10" aria-hidden="true" />
          <p className="font-medium text-foreground">Wala pang CR dito. Mag-add ka!</p>
          <p className="text-sm">Ikaw ang unang tumulong sa komunidad.</p>
          <Button asChild size="sm" className="mt-2">
            <Link href="/add">
              <Plus aria-hidden="true" />
              Magdagdag ng CR
            </Link>
          </Button>
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-12 text-center text-muted-foreground">
          <SearchX className="h-10 w-10" aria-hidden="true" />
          <p className="font-medium text-foreground">Walang CR na tugma</p>
          <p className="text-sm">Subukang bawasan ang mga filter.</p>
          <Button variant="outline" size="sm" className="mt-2" onClick={() => setActiveFilters([])}>
            Clear all filters
          </Button>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map(({ restroom, distanceKm }) => (
            <li key={restroom.id}>
              <RestroomListItem
                restroom={restroom}
                distanceKm={distanceKm}
                isUserAdded={isUserAdded(restroom)}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
