"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { MapPin, Navigation } from "lucide-react";

import { MiniMapLoader } from "@/components/map/MiniMapLoader";
import { BackButton } from "@/components/restroom/BackButton";
import { DeleteRestroomButton } from "@/components/restroom/DeleteRestroomButton";
import { DistanceFromUser } from "@/components/restroom/DistanceFromUser";
import { PriceBadge, UserAddedBadge } from "@/components/restroom/RestroomBadges";
import { RestroomNotFound } from "@/components/restroom/RestroomNotFound";
import { RestroomRating } from "@/components/restroom/RestroomRating";
import { ShareButton } from "@/components/restroom/ShareButton";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useRestrooms } from "@/hooks/use-restrooms";
import { getDirectionsUrl } from "@/lib/directions";
import {
  ALL_AMENITIES,
  getAmenityIcon,
  getAmenityLabel,
  getDisplayAmenities,
} from "@/lib/icons";
import { cn } from "@/lib/utils";

/**
 * Client-side because user-added restrooms only exist in localStorage.
 * Mock restrooms still render on the server (the store's server snapshot
 * contains them), so shared links to mock restrooms get full HTML.
 */
export function RestroomDetail({ id }: { id: string }) {
  const router = useRouter();
  const { restrooms, isUserAdded, loading } = useRestrooms();
  const restroom = restrooms.find((r) => r.id === id);
  const isOwner = restroom ? isUserAdded(restroom.id) : false;

  // Server metadata only knows mock restrooms; set the title for user-added ones too.
  useEffect(() => {
    if (restroom) document.title = `Poopipoo — ${restroom.name}`;
  }, [restroom]);

  if (!restroom) {
    // Before mount, user-added restrooms aren't loaded yet — don't flash "not found".
    return loading ? <DetailSkeleton /> : <RestroomNotFound />;
  }

  return (
    <article className="mx-auto flex w-full max-w-screen-md flex-col gap-5 px-4 py-3 pb-8">
      <BackButton />

      <header className="flex flex-col gap-2">
        {isOwner && <UserAddedBadge label="Iyong contribution" className="w-fit" />}
        <h1 className="text-2xl font-bold leading-tight">{restroom.name}</h1>
        <div className="flex flex-wrap items-center gap-2">
          <RestroomRating rating={restroom.rating} reviewCount={restroom.reviewCount} />
          <PriceBadge isFree={restroom.isFree} />
        </div>
        <p className="flex items-start gap-1.5 text-sm text-muted-foreground">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          {restroom.address}
        </p>
        <DistanceFromUser latitude={restroom.latitude} longitude={restroom.longitude} />
      </header>

      {/* `isolate` keeps Leaflet's z-indexes from covering the header/nav/toasts */}
      <div className="relative isolate h-48 overflow-hidden rounded-lg border">
        <MiniMapLoader
          latitude={restroom.latitude}
          longitude={restroom.longitude}
          label={restroom.name}
        />
      </div>

      <section className="flex flex-col gap-2">
        <h2 className="font-semibold">Amenities</h2>
        {/* Shows every amenity type so it's clear what's missing too (e.g. walang bidet) */}
        <ul className="grid grid-cols-2 gap-2">
          {getDisplayAmenities(ALL_AMENITIES).map((amenity) => {
            const Icon = getAmenityIcon(amenity);
            const available = restroom.amenities.includes(amenity);
            return (
              <li
                key={amenity}
                className={cn(
                  "flex items-center gap-2 rounded-md border px-3 py-2 text-sm",
                  available
                    ? "border-[#8B4513]/30 bg-[#8B4513]/5"
                    : "text-muted-foreground opacity-60"
                )}
              >
                <Icon
                  className={cn("h-4 w-4 shrink-0", available && "text-[#8B4513]")}
                  aria-hidden="true"
                />
                <span className={cn(!available && "line-through")}>{getAmenityLabel(amenity)}</span>
                <span className="sr-only">{available ? "(meron)" : "(wala)"}</span>
              </li>
            );
          })}
        </ul>
      </section>

      {restroom.description && (
        <section className="flex flex-col gap-2">
          <h2 className="font-semibold">Description</h2>
          <p className="whitespace-pre-line text-sm leading-relaxed">{restroom.description}</p>
        </section>
      )}

      <div className="grid grid-cols-2 gap-2">
        <Button asChild size="lg" className="w-full">
          <a
            href={getDirectionsUrl(restroom.latitude, restroom.longitude)}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Navigation aria-hidden="true" />
            Get Directions
          </a>
        </Button>
        <ShareButton />
      </div>

      {isOwner && (
        <DeleteRestroomButton
          restroom={restroom}
          variant="full"
          onDeleted={() => router.replace("/profile")}
        />
      )}
    </article>
  );
}

function DetailSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-screen-md flex-col gap-4 px-4 py-4" aria-busy="true">
      <Skeleton className="h-8 w-24" />
      <Skeleton className="h-8 w-3/4" />
      <Skeleton className="h-5 w-1/2" />
      <Skeleton className="h-48 w-full" />
      <Skeleton className="h-24 w-full" />
    </div>
  );
}
