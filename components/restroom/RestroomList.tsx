"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ChevronDown, CloudOff, Loader2, LocateOff, Plus, RefreshCw, SearchX, Toilet } from "lucide-react";

import {
  applyFilters,
  RestroomFilters,
  type FilterId,
} from "@/components/restroom/RestroomFilters";
import { RestroomListItem } from "@/components/restroom/RestroomListItem";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/EmptyState";
import { SearchInput } from "@/components/ui/SearchInput";
import { Skeleton } from "@/components/ui/skeleton";
import { useErrorToast } from "@/hooks/use-error-toast";
import { useGeolocation } from "@/hooks/use-geolocation";
import { useRestrooms } from "@/hooks/use-restrooms";
import { staggerItemCapped } from "@/lib/animations";
import { calculateDistance } from "@/lib/distance";
import type { Restroom } from "@/types/restroom";
import { useI18n } from "@/hooks/use-i18n";
import { format } from "@/lib/i18n/format";

/** Lowercase, no accents ("Parañaque" matches "paranaque"). */
const normalize = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

/** Every word of the query must appear in the CR's name or address. */
function matchesQuery(restroom: Restroom, words: string[]): boolean {
  if (words.length === 0) return true;
  const haystack = normalize(`${restroom.name} ${restroom.address}`);
  return words.every((word) => haystack.includes(word));
}

// Hundreds of restrooms (OSM import): render the nearest ones first, more on demand
const PAGE_SIZE = 40;

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
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(PAGE_SIZE);
  const { t } = useI18n();
  const queryWords = useMemo(() => normalize(query).split(/\s+/).filter(Boolean), [query]);

  useErrorToast(dataError, t.list.loadError, retry);

  // A new search/filter starts from the top again
  useEffect(() => setLimit(PAGE_SIZE), [activeFilters, query]);

  // Wait for the location too, so the list doesn't reorder right after appearing.
  const loading = dataLoading || locationLoading;

  // Filter, then sort: nearest first when we know where the user is,
  // otherwise highest rating first.
  const items = useMemo<RestroomWithDistance[]>(() => {
    const matching = applyFilters(restrooms, activeFilters).filter((restroom) => matchesQuery(restroom, queryWords));
    const withDistance = matching.map((restroom) => ({
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
  }, [restrooms, activeFilters, queryWords, hasLocation, latitude, longitude]);

  return (
    <div className="flex flex-col gap-3">
      {/* Search by CR name or address (filters the list below; no network request) */}
      <SearchInput
        value={query}
        onValueChange={setQuery}
        label={t.list.searchLabel}
        placeholder={t.list.searchPlaceholder}
      />
      <RestroomFilters active={activeFilters} onChange={setActiveFilters} />

      {locationLoading ? (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground" role="status">
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
          {t.list.gettingLocation}
        </p>
      ) : !hasLocation ? (
        // text-foreground/80: muted-foreground on bg-muted is below WCAG AA contrast (4.3:1)
        <div className="flex items-center justify-between gap-2 rounded-md bg-muted px-3 py-2 text-xs text-foreground/80">
          <span className="flex items-center gap-1.5">
            <LocateOff className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            {locationError ?? t.list.noLocation} {t.list.sortedByRating}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => void requestLocation()}
            className="h-7 shrink-0 px-2 text-xs"
          >
            <RefreshCw aria-hidden="true" />
            {t.common.retry}
          </Button>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">{t.list.sortedByDistance}</p>
      )}

      {dataError && restrooms.length === 0 ? (
        // Error with nothing cached: full error state with retry
        <EmptyState
          icon={<CloudOff />}
          tone="error"
          role="alert"
          title={t.list.loadError}
          description={t.list.checkInternet}
          action={
            <Button variant="outline" size="sm" onClick={() => void retry()}>
              <RefreshCw aria-hidden="true" />
              {t.common.retry}
            </Button>
          }
        />
      ) : loading ? (
        <ul className="flex flex-col gap-2" aria-busy="true" aria-label={t.list.loadingLabel}>
          {Array.from({ length: 4 }, (_, i) => (
            <li key={i}>
              <Skeleton className="h-[104px] w-full" />
            </li>
          ))}
        </ul>
      ) : restrooms.length === 0 ? (
        <EmptyState
          icon={<Toilet />}
          title={t.list.emptyTitle}
          description={t.list.emptyDescription}
          action={
            <Button asChild size="sm">
              <Link href="/add">
                <Plus aria-hidden="true" />
                {t.list.addRestroom}
              </Link>
            </Button>
          }
        />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<SearchX />}
          title={t.list.noMatchTitle}
          description={
            query.trim()
              ? format(t.list.noMatchQuery, { query: query.trim() })
              : t.list.noMatchFilters
          }
          action={
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setActiveFilters([]);
                setQuery("");
              }}
            >
              {query.trim() ? t.list.clearSearchAndFilters : t.list.clearFilters}
            </Button>
          }
        />
      ) : (
        <>
        <ul className="flex flex-col gap-2">
          {items.slice(0, limit).map(({ restroom, distanceKm }, index) => (
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
        {items.length > limit && (
          <Button variant="outline" onClick={() => setLimit((n) => n + PAGE_SIZE)} className="w-full">
            <ChevronDown aria-hidden="true" />
            {format(t.list.showMore, { count: items.length - limit })}
          </Button>
        )}
        </>
      )}
    </div>
  );
}
