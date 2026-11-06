"use client";

import { useMemo } from "react";

import { SearchBar } from "@/components/map/SearchBar";
import { applyFilters, RestroomFilters, type FilterId } from "@/components/restroom/RestroomFilters";
import { RestroomResults, type RestroomWithDistance } from "@/components/restroom/RestroomList";
import { useI18n } from "@/hooks/use-i18n";
import { calculateDistance } from "@/lib/distance";
import type { SearchResult } from "@/lib/search";
import type { Restroom } from "@/types/restroom";

interface Point {
  latitude: number;
  longitude: number;
}

interface MapSidebarProps {
  /** What the map has loaded. The sidebar never fetches: the store holds one area, and that's the map's. */
  restrooms: Restroom[];
  mapCenter: Point;
  /** From "Near Me" only, so opening the page doesn't ask for location access. */
  userLocation: Point | null;
  activeFilters: FilterId[];
  onFiltersChange: (active: FilterId[]) => void;
  onSelect: (restroom: Restroom) => void;
  onSearchSelect: (result: SearchResult) => void;
  isUserAdded: (restroom: Restroom) => boolean;
  loading: boolean;
  error: string | null;
  retry: () => void;
}

/** List beside the map on md and up: the restrooms around the map's center, nearest first. */
export function MapSidebar({
  restrooms,
  mapCenter,
  userLocation,
  activeFilters,
  onFiltersChange,
  onSelect,
  onSearchSelect,
  isUserAdded,
  loading,
  error,
  retry,
}: MapSidebarProps) {
  const { t } = useI18n();

  const items = useMemo<RestroomWithDistance[]>(() => {
    const fromCenter = (restroom: Restroom) =>
      calculateDistance(mapCenter.latitude, mapCenter.longitude, restroom.latitude, restroom.longitude);
    return applyFilters(restrooms, activeFilters)
      .map((restroom) => ({ restroom, order: fromCenter(restroom) }))
      .sort((a, b) => a.order - b.order)
      .map(({ restroom }) => ({
        restroom,
        distanceKm: userLocation
          ? calculateDistance(userLocation.latitude, userLocation.longitude, restroom.latitude, restroom.longitude)
          : null,
      }));
  }, [restrooms, activeFilters, mapCenter, userLocation]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* z-10: the search results dropdown opens over the list */}
      <div className="relative z-10 flex flex-col gap-3 border-b p-4">
        <SearchBar onSelect={onSearchSelect} className="w-full max-w-lg" />
        <RestroomFilters active={activeFilters} onChange={onFiltersChange} />
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4">
        <p className="text-xs text-muted-foreground">{t.list.sortedByMapCenter}</p>
        <RestroomResults
          items={items}
          unfilteredCount={restrooms.length}
          loading={loading}
          error={error}
          retry={retry}
          isUserAdded={isUserAdded}
          noMatchDescription={t.list.noMatchFilters}
          clearLabel={t.list.clearFilters}
          onClear={() => onFiltersChange([])}
          resetKey={activeFilters.join()}
          onSelect={onSelect}
        />
      </div>
    </div>
  );
}
