"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { MapPin, Navigation } from "lucide-react";

import { MiniMapLoader } from "@/components/map/MiniMapLoader";
import { NavigateButton } from "@/components/navigation/NavigateButton";
import { NavigationPanel } from "@/components/navigation/NavigationPanel";
import { BackButton } from "@/components/restroom/BackButton";
import { DeleteRestroomButton } from "@/components/restroom/DeleteRestroomButton";
import { DistanceFromUser } from "@/components/restroom/DistanceFromUser";
import { PriceBadge, UserAddedBadge } from "@/components/restroom/RestroomBadges";
import { RestroomRating } from "@/components/restroom/RestroomRating";
import { ReviewsSection, type ReviewViewer } from "@/components/restroom/ReviewsSection";
import { ShareButton } from "@/components/restroom/ShareButton";
import { Button } from "@/components/ui/button";
import { useNavigation } from "@/hooks/use-navigation";
import {
  ALL_AMENITIES,
  getAmenityIcon,
  getAmenityLabel,
  getDisplayAmenities,
} from "@/lib/icons";
import { cn } from "@/lib/utils";
import type { Restroom } from "@/types/restroom";
import type { Review } from "@/types/review";

interface RestroomDetailProps {
  restroom: Restroom;
  /** Decided on the server from the validated session. */
  isOwner: boolean;
  /** Initial review data, loaded on the server. */
  reviews: {
    viewer: ReviewViewer | null;
    initialMyReview: Review | null;
    initialReviews: Review[] | null;
    initialTotal: number;
    startEditing: boolean;
  };
}

/**
 * Restroom detail view. Data is loaded on the server (app/restroom/[id]/page.tsx);
 * this is a Client Component only for the interactive bits (delete, router).
 */
export function RestroomDetail({ restroom, isOwner, reviews }: RestroomDetailProps) {
  const router = useRouter();
  const nav = useNavigation();

  // Navigation state that belongs to this restroom
  const navHere = nav.destination?.id === restroom.id ? nav.status : "idle";
  const planning = navHere === "routing" || navHere === "preview" || navHere === "error";
  const underway = navHere === "navigating" || navHere === "arrived";
  const destination = {
    id: restroom.id,
    name: restroom.name,
    latitude: restroom.latitude,
    longitude: restroom.longitude,
  };

  const handleStart = () => {
    nav.startNavigation();
    // Live navigation runs on the full-screen map
    router.push("/");
  };

  return (
    <article
      className={cn(
        "mx-auto flex w-full max-w-screen-md flex-col gap-5 px-4 py-3",
        // Leave room for the fixed navigation panel
        planning ? "pb-[60dvh]" : "pb-8"
      )}
    >
      <BackButton />

      <header className="flex flex-col gap-2">
        {isOwner && <UserAddedBadge label="Iyong contribution" className="w-fit" />}
        <h1 className="text-2xl font-bold leading-tight">{restroom.name}</h1>
        <div className="flex flex-wrap items-center gap-2">
          <a href="#reviews" className="rounded-sm hover:underline">
            <RestroomRating rating={restroom.rating} reviewCount={restroom.reviewCount} />
          </a>
          <PriceBadge isFree={restroom.isFree} />
        </div>
        <p className="flex items-start gap-1.5 text-sm text-muted-foreground">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          {restroom.address}
        </p>
        <DistanceFromUser latitude={restroom.latitude} longitude={restroom.longitude} />
      </header>

      {/* `isolate` keeps Leaflet's z-indexes from covering the header/nav/toasts */}
      {/* Grows to show the route preview */}
      <div
        className={cn(
          "relative isolate overflow-hidden rounded-lg border transition-[height]",
          planning && nav.route ? "h-72" : "h-48"
        )}
      >
        <MiniMapLoader
          latitude={restroom.latitude}
          longitude={restroom.longitude}
          label={restroom.name}
          route={planning ? (nav.route?.coordinates ?? null) : null}
          origin={planning ? nav.origin : null}
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        {underway ? (
          <Button asChild size="lg" className="w-full">
            <Link href="/">
              <Navigation aria-hidden="true" />
              Bumalik sa navigation
            </Link>
          </Button>
        ) : (
          <NavigateButton destination={destination} />
        )}
        <ShareButton />
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

      <ReviewsSection restroomId={restroom.id} {...reviews} />

      {planning && (
        <NavigationPanel
          nav={nav}
          progress={null}
          onStart={handleStart}
          onStop={nav.stopNavigation}
          onRetry={nav.retryRoute}
          onProfileChange={nav.setProfile}
          onVoiceChange={nav.setVoiceEnabled}
          // Fixed just above the bottom nav bar (h-16 + safe area)
          className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 mx-auto max-w-screen-md"
        />
      )}

      {isOwner && (
        <DeleteRestroomButton
          restroom={restroom}
          variant="full"
          onDeleted={() => {
            router.replace("/profile");
            router.refresh();
          }}
        />
      )}
    </article>
  );
}

