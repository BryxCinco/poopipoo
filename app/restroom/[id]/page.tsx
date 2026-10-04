import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MapPin, Navigation } from "lucide-react";

import { MiniMapLoader } from "@/components/map/MiniMapLoader";
import { BackButton } from "@/components/restroom/BackButton";
import { DistanceFromUser } from "@/components/restroom/DistanceFromUser";
import { PriceBadge } from "@/components/restroom/RestroomBadges";
import { ShareButton } from "@/components/restroom/ShareButton";
import { StarRating } from "@/components/restroom/StarRating";
import { Button } from "@/components/ui/button";
import { getDirectionsUrl } from "@/lib/directions";
import {
  ALL_AMENITIES,
  getAmenityIcon,
  getAmenityLabel,
  getDisplayAmenities,
} from "@/lib/icons";
import { getRestroomById, MOCK_RESTROOMS } from "@/lib/mock-restrooms";
import { cn } from "@/lib/utils";

interface RestroomPageProps {
  params: { id: string };
}

// Pre-render every mock restroom at build time. Unknown ids still render
// on demand and hit notFound().
export function generateStaticParams(): RestroomPageProps["params"][] {
  return MOCK_RESTROOMS.map((restroom) => ({ id: restroom.id }));
}

export function generateMetadata({ params }: RestroomPageProps): Metadata {
  const restroom = getRestroomById(params.id);
  if (!restroom) {
    return { title: "Poopipoo — Hindi mahanap ang CR" };
  }
  return {
    title: `Poopipoo — ${restroom.name}`,
    description: `${restroom.description} ${restroom.address}`,
  };
}

export default function RestroomPage({ params }: RestroomPageProps) {
  const restroom = getRestroomById(params.id);
  if (!restroom) {
    notFound();
  }

  return (
    <article className="mx-auto flex w-full max-w-screen-md flex-col gap-5 px-4 py-3 pb-8">
      <BackButton />

      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold leading-tight">{restroom.name}</h1>
        <div className="flex flex-wrap items-center gap-2">
          <StarRating rating={restroom.rating} />
          <span className="text-sm font-medium">{restroom.rating.toFixed(1)}</span>
          <span className="text-sm text-muted-foreground">({restroom.reviewCount} reviews)</span>
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

      <section className="flex flex-col gap-2">
        <h2 className="font-semibold">Description</h2>
        <p className="text-sm leading-relaxed">{restroom.description}</p>
      </section>

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
    </article>
  );
}
