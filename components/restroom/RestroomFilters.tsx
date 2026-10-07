"use client";

import { motion } from "framer-motion";
import { BadgeCheck, X, type LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SPRING } from "@/lib/animations";
import { getAmenityIcon } from "@/lib/icons";
import { cn } from "@/lib/utils";
import type { Restroom } from "@/types/restroom";
import { useI18n } from "@/hooks/use-i18n";
import { plural } from "@/lib/i18n/format";

export type FilterId = "free" | "bidet" | "wheelchair" | "tissue" | "soap" | "air-conditioned";

interface FilterDef {
  /** Also the key of its label in t.filters */
  id: FilterId;
  icon: LucideIcon;
  matches: (restroom: Restroom) => boolean;
}

export const FILTERS: FilterDef[] = [
  { id: "free", icon: BadgeCheck, matches: (r) => r.isFree },
  {
    id: "bidet",
    icon: getAmenityIcon("bidet"),
    matches: (r) => r.amenities.includes("bidet"),
  },
  {
    id: "wheelchair",
    icon: getAmenityIcon("wheelchair"),
    matches: (r) => r.amenities.includes("wheelchair"),
  },
  {
    id: "tissue",
    icon: getAmenityIcon("tissue"),
    matches: (r) => r.amenities.includes("tissue"),
  },
  {
    id: "soap",
    icon: getAmenityIcon("soap"),
    matches: (r) => r.amenities.includes("soap"),
  },
  {
    id: "air-conditioned",
    icon: getAmenityIcon("air-conditioned"),
    matches: (r) => r.amenities.includes("air-conditioned"),
  },
];

/** Keeps restrooms that match ALL active filters (AND). No active filters → everything. */
export function applyFilters(restrooms: Restroom[], active: FilterId[]): Restroom[] {
  const defs = FILTERS.filter((f) => active.includes(f.id));
  return restrooms.filter((r) => defs.every((f) => f.matches(r)));
}

interface ChipProps {
  label: string;
  icon?: LucideIcon;
  active: boolean;
  onClick: () => void;
}

function FilterChip({ label, icon: Icon, active, onClick }: ChipProps) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      whileTap={{ scale: 0.92 }}
      transition={SPRING}
      className={cn(
        "flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-sm transition-[color,background-color,border-color,box-shadow] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        active
          ? "border-primary bg-primary text-primary-foreground shadow-sm"
          : "bg-card text-foreground hover:border-primary/40 hover:bg-muted"
      )}
    >
      {Icon && <Icon className="h-3.5 w-3.5" aria-hidden="true" />}
      {label}
    </motion.button>
  );
}

interface RestroomFiltersProps {
  active: FilterId[];
  onChange: (active: FilterId[]) => void;
}

export function RestroomFilters({ active, onChange }: RestroomFiltersProps) {
  const { t } = useI18n();
  const toggle = (id: FilterId) =>
    onChange(active.includes(id) ? active.filter((a) => a !== id) : [...active, id]);

  return (
    <div className="flex flex-col gap-1">
      {/* Negative margin + padding lets chips scroll edge-to-edge on mobile */}
      <div
        className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        role="group"
        aria-label={t.filters.groupLabel}
      >
        <FilterChip label={t.filters.all} active={active.length === 0} onClick={() => onChange([])} />
        {FILTERS.map((filter) => (
          <FilterChip
            key={filter.id}
            label={t.filters[filter.id]}
            icon={filter.icon}
            active={active.includes(filter.id)}
            onClick={() => toggle(filter.id)}
          />
        ))}
      </div>
      {active.length > 0 && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{plural(t.filters.activeCount, active.length)}</span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onChange([])}
            className="h-7 px-2 text-xs text-muted-foreground"
          >
            <X aria-hidden="true" />
            {t.filters.clearAll}
          </Button>
        </div>
      )}
    </div>
  );
}
