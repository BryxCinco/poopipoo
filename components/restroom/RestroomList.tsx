"use client";

import { useMemo, useState } from "react";
import { Loader2, LocateOff, RefreshCw, SearchX } from "lucide-react";

import {
  applyFilters,
  RestroomFilters,
  type FilterId,
} from "@/components/restroom/RestroomFilters";
import { RestroomListItem } from "@/components/restroom/RestroomListItem";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useGeolocation } from "@/hooks/use-geolocation";
import { calculateDistance } from "@/lib/distance";
import type { Restroom } from "@/types/restroom";

interface RestroomListProps {
  restrooms: Restroom[];
}

interface RestroomWithDistance {
  restroom: Restroom;
  distanceKm: number | null;
}

export function RestroomList({ restrooms }: RestroomListProps) {
  const { latitude, longitude, hasLocation, loading, error, requestLocation } = useGeolocation({
    requestOnMount: true,
  });
  const [activeFilters, setActiveFilters] = useState<FilterId[]>([]);

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

      {loading ? (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground" role="status">
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
          Kinukuha ang iyong location...
        </p>
      ) : !hasLocation ? (
        <div className="flex items-center justify-between gap-2 rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <LocateOff className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            {error ?? "Walang location."} Naka-sort ayon sa rating.
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

      {loading ? (
        <ul className="flex flex-col gap-2" aria-hidden="true">
          {Array.from({ length: 4 }, (_, i) => (
            <li key={i}>
              <Skeleton className="h-[104px] w-full" />
            </li>
          ))}
        </ul>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-12 text-center text-muted-foreground">
          <SearchX className="h-10 w-10" aria-hidden="true" />
          <p className="font-medium text-foreground">Walang CR na tugma</p>
          <p className="text-sm">Subukang bawasan ang mga filter.</p>
          {activeFilters.length > 0 && (
            <Button variant="outline" size="sm" className="mt-2" onClick={() => setActiveFilters([])}>
              Clear all filters
            </Button>
          )}
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map(({ restroom, distanceKm }) => (
            <li key={restroom.id}>
              <RestroomListItem restroom={restroom} distanceKm={distanceKm} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
