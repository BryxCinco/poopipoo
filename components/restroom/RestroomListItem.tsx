"use client";

import Image from "next/image";
import Link from "next/link";
import { ChevronRight, MapPin, Toilet } from "lucide-react";

import {
  AmenityBadge,
  PriceBadge,
  UserAddedBadge,
} from "@/components/restroom/RestroomBadges";
import { RestroomStatusBadge } from "@/components/moderation/RestroomStatusBadge";
import { RestroomRating } from "@/components/restroom/RestroomRating";
import { AnimatedCard } from "@/components/ui/AnimatedCard";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/hooks/use-i18n";
import { formatDistance } from "@/lib/distance";
import { format } from "@/lib/i18n/format";
import { getDisplayAmenities } from "@/lib/icons";
import type { Restroom } from "@/types/restroom";

const MAX_AMENITY_BADGES = 3;

interface RestroomListItemProps {
  restroom: Restroom;
  /** Kilometers from the user, or null when the location is unknown. */
  distanceKm: number | null;
  isUserAdded?: boolean;
}

export function RestroomListItem({
  restroom,
  distanceKm,
  isUserAdded = false,
}: RestroomListItemProps) {
  const amenities = getDisplayAmenities(restroom.amenities);
  const shownAmenities = amenities.slice(0, MAX_AMENITY_BADGES);
  const hiddenCount = amenities.length - shownAmenities.length;
  const thumbnail = restroom.images[0];
  const { t } = useI18n();

  return (
    <AnimatedCard interactive className="group">
      <Link
        href={`/restroom/${restroom.id}`}
        className="flex gap-3 rounded-xl p-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <div className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-primary/10 text-primary">
          {thumbnail ? (
            // `unoptimized`: image hosts aren't configured yet (no next.config remotePatterns)
            <Image
              src={thumbnail}
              alt=""
              fill
              sizes="56px"
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              unoptimized
            />
          ) : (
            <Toilet className="h-6 w-6 transition-transform duration-200 group-hover:scale-110" aria-hidden="true" />
          )}
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex items-start justify-between gap-2">
            <h2 className="line-clamp-2 font-semibold leading-tight">{restroom.name}</h2>
            <PriceBadge isFree={restroom.isFree} className="shrink-0" />
          </div>

          {/* Approved is the normal case: only the exceptions get a badge in the list */}
          {(isUserAdded || (restroom.status && restroom.status !== "approved")) && (
            <div className="flex flex-wrap gap-1">
              {restroom.status && restroom.status !== "approved" && (
                <RestroomStatusBadge status={restroom.status} className="px-1.5 py-0 text-[11px]" />
              )}
              {isUserAdded && <UserAddedBadge className="w-fit px-1.5 py-0 text-[11px]" />}
            </div>
          )}

          <RestroomRating rating={restroom.rating} reviewCount={restroom.reviewCount} size="sm" />

          {distanceKm !== null && (
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
              {formatDistance(distanceKm)}
            </p>
          )}

          <div className="mt-0.5 flex flex-wrap gap-1">
            {shownAmenities.map((amenity) => (
              <AmenityBadge key={amenity} amenity={amenity} className="px-1.5 py-0 text-[11px]" />
            ))}
            {hiddenCount > 0 && (
              <Badge variant="secondary" className="px-1.5 py-0 text-[11px] font-normal">
                {format(t.list.moreAmenities, { count: hiddenCount })}
              </Badge>
            )}
          </div>
        </div>

        <ChevronRight
          className="h-4 w-4 shrink-0 self-center text-muted-foreground transition-transform duration-200 group-hover:translate-x-0.5"
          aria-hidden="true"
        />
      </Link>
    </AnimatedCard>
  );
}
