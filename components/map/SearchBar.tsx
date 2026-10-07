"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Building,
  Bus,
  Church,
  Clock,
  Coffee,
  Fuel,
  GraduationCap,
  Hospital,
  Hotel,
  Landmark,
  MapPin,
  Plane,
  Route,
  SearchX,
  ShoppingBag,
  Store,
  TrainFront,
  Trees,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";

import { SearchInput } from "@/components/ui/SearchInput";
import { useI18n } from "@/hooks/use-i18n";
import { DURATION, EASE_OUT } from "@/lib/animations";
import { plural } from "@/lib/i18n/format";
import { addRecentSearch, clearRecentSearches, loadRecentSearches } from "@/lib/recent-searches";
import {
  isAbortError,
  MIN_QUERY_LENGTH,
  SearchError,
  searchLocation,
  type SearchErrorKind,
  type SearchResult,
} from "@/lib/search";
import { cn } from "@/lib/utils";

/**
 * Place search for the map (Nominatim, free). Type → debounced search (300ms)
 * → pick a result → `onSelect` (the map flies there).
 *
 * Accessible combobox: arrow keys move through the options, Enter picks,
 * Escape closes. When the field is empty, recent searches are shown instead.
 */

const DEBOUNCE_MS = 300;

/** Picks an icon from the OSM category/type (restaurant, mall, landmark, ...). */
export function getPlaceIcon(category: string, type: string): LucideIcon {
  switch (type) {
    case "restaurant":
    case "fast_food":
    case "food_court":
      return UtensilsCrossed;
    case "cafe":
      return Coffee;
    case "mall":
    case "department_store":
      return ShoppingBag;
    case "supermarket":
    case "convenience":
      return Store;
    case "hospital":
    case "clinic":
      return Hospital;
    case "school":
    case "university":
    case "college":
      return GraduationCap;
    case "place_of_worship":
      return Church;
    case "fuel":
      return Fuel;
    case "station":
    case "halt":
      return TrainFront;
    case "bus_station":
    case "bus_stop":
      return Bus;
    case "aerodrome":
    case "terminal":
      return Plane;
    case "hotel":
    case "hostel":
    case "guest_house":
      return Hotel;
    case "park":
    case "garden":
      return Trees;
  }
  switch (category) {
    case "shop":
      return Store;
    case "tourism":
    case "historic":
      return Landmark;
    case "railway":
      return TrainFront;
    case "highway":
      return Route;
    case "building":
    case "office":
      return Building;
    case "leisure":
      return Trees;
    case "aeroway":
      return Plane;
    default:
      return MapPin;
  }
}

/** Address without the leading name (it's already on the first line). */
function secondaryText(result: SearchResult): string {
  const parts = result.display_name.split(",").map((part) => part.trim());
  if (parts[0] === result.name) parts.shift();
  return parts.join(", ");
}

type Status = "idle" | "loading" | "done" | "error";

interface SearchBarProps {
  onSelect: (result: SearchResult) => void;
  className?: string;
}

export function SearchBar({ onSelect, className }: SearchBarProps) {
  const listboxId = useId();
  const { t } = useI18n();
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [results, setResults] = useState<SearchResult[]>([]);
  // Error kind; the message is picked in the current language when rendering
  const [errorKind, setErrorKind] = useState<SearchErrorKind | null>(null);
  const [recent, setRecent] = useState<SearchResult[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);

  const trimmed = query.trim();
  const searching = trimmed.length >= MIN_QUERY_LENGTH;
  // Empty field → recent searches; otherwise the search results
  const options = searching ? results : trimmed.length === 0 ? recent : [];
  const showingRecent = !searching && trimmed.length === 0 && recent.length > 0;

  // Read recent searches after mount (localStorage isn't available on the server)
  useEffect(() => setRecent(loadRecentSearches()), []);

  // Debounced search; a newer query cancels the older request
  useEffect(() => {
    setActiveIndex(-1);
    if (!searching) {
      setStatus("idle");
      setResults([]);
      setErrorKind(null);
      return;
    }
    setStatus("loading");
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      searchLocation(trimmed, controller.signal)
        .then((found) => {
          setResults(found);
          setErrorKind(null);
          setStatus("done");
        })
        .catch((error: unknown) => {
          if (isAbortError(error)) return;
          setResults([]);
          setErrorKind(error instanceof SearchError ? error.kind : "server");
          setStatus("error");
        });
    }, DEBOUNCE_MS);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [trimmed, searching]);

  // Close when tapping anywhere outside the search bar
  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  const choose = (result: SearchResult) => {
    setRecent(addRecentSearch(result));
    setQuery(result.name);
    setOpen(false);
    setActiveIndex(-1);
    inputRef.current?.blur(); // hides the phone keyboard so the map is visible
    onSelect(result);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      if (options.length === 0) return;
      event.preventDefault();
      setOpen(true);
      const step = event.key === "ArrowDown" ? 1 : -1;
      setActiveIndex((index) => (index + step + options.length) % options.length);
    } else if (event.key === "Enter") {
      // Enter picks the highlighted option, or the top result
      const pick = options[activeIndex] ?? (searching ? results[0] : undefined);
      if (pick) {
        event.preventDefault();
        choose(pick);
      }
    } else if (event.key === "Escape") {
      if (open) {
        event.preventDefault();
        setOpen(false);
      } else if (query) {
        setQuery("");
      }
    }
  };

  const hasPanelContent = searching || showingRecent;
  const expanded = open && hasPanelContent;
  const optionId = (index: number) => `${listboxId}-option-${index}`;

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <SearchInput
        ref={inputRef}
        value={query}
        onValueChange={(value) => {
          setQuery(value);
          setOpen(true);
        }}
        onClear={() => inputRef.current?.focus()}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        label={t.search.placeLabel}
        placeholder={t.search.placePlaceholder}
        loading={status === "loading"}
        role="combobox"
        aria-expanded={expanded}
        aria-controls={listboxId}
        aria-autocomplete="list"
        aria-activedescendant={expanded && activeIndex >= 0 ? optionId(activeIndex) : undefined}
        className="h-12 rounded-2xl border-border/60 shadow-lg"
      />

      {/* Screen readers: announce how many results came back */}
      <p className="sr-only" aria-live="polite">
        {status === "done" ? plural(t.search.resultCount, results.length) : ""}
      </p>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0, transition: { duration: DURATION.base, ease: EASE_OUT } }}
            exit={{ opacity: 0, y: -6, transition: { duration: DURATION.fast } }}
            className="absolute inset-x-0 top-full mt-2 overflow-hidden rounded-2xl border bg-card shadow-xl"
          >
            {showingRecent && (
              <div className="flex items-center justify-between px-3 pb-1 pt-2.5">
                <span className="text-xs font-medium text-muted-foreground">{t.search.recent}</span>
                <button
                  type="button"
                  onClick={() => {
                    clearRecentSearches();
                    setRecent([]);
                    inputRef.current?.focus();
                  }}
                  aria-label={t.search.clearRecentLabel}
                  className="rounded-md px-1.5 py-0.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {t.search.clearRecent}
                </button>
              </div>
            )}

            {/* Status rows (not options) */}
            {searching && status === "loading" && results.length === 0 && (
              <p className="px-4 py-3 text-sm text-muted-foreground">{t.search.searching}</p>
            )}
            {searching && status === "error" && (
              <p role="alert" className="px-4 py-3 text-sm text-destructive">
                {errorKind && t.search.errors[errorKind]}
              </p>
            )}
            {searching && status === "done" && results.length === 0 && (
              <p className="flex items-center gap-2 px-4 py-3 text-sm text-muted-foreground">
                <SearchX className="h-4 w-4 shrink-0" aria-hidden="true" />
                {t.search.noResults}
              </p>
            )}

            <ul id={listboxId} role="listbox" aria-label={t.search.resultsLabel} className={cn("max-h-[50dvh] overflow-y-auto", options.length > 0 && "py-1")}>
              {options.map((result, index) => {
                const Icon = showingRecent ? Clock : getPlaceIcon(result.category, result.type);
                const active = index === activeIndex;
                return (
                  <li
                    key={`${result.display_name}-${result.lat}-${result.lon}`}
                    id={optionId(index)}
                    role="option"
                    aria-selected={active}
                    // Keep focus in the input while picking
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => choose(result)}
                    onMouseEnter={() => setActiveIndex(index)}
                    className={cn(
                      "flex cursor-pointer items-start gap-3 px-3 py-2.5 transition-colors duration-100",
                      active ? "bg-muted" : "hover:bg-muted/60"
                    )}
                  >
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate text-sm font-semibold">{result.name}</span>
                      <span className="line-clamp-2 text-xs text-muted-foreground">{secondaryText(result)}</span>
                    </span>
                  </li>
                );
              })}
            </ul>

            {/* Nominatim usage policy: credit OpenStreetMap */}
            {searching && results.length > 0 && (
              <p className="border-t px-3 py-1.5 text-[10px] text-muted-foreground">
                {t.search.attribution}
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
