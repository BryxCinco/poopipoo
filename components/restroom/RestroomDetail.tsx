"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, useTransform } from "framer-motion";
import { MapPin, Navigation, Toilet } from "lucide-react";

import { MiniMapLoader } from "@/components/map/MiniMapLoader";
import { ReportButton } from "@/components/moderation/ReportButton";
import { RestroomStatusBadge } from "@/components/moderation/RestroomStatusBadge";
import { VerifyButton } from "@/components/moderation/VerifyButton";
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
import { useMainScrollY } from "@/hooks/use-main-scroll";
import { useNavigation } from "@/hooks/use-navigation";
import { slideUp, staggerContainer, staggerItem } from "@/lib/animations";
import {
  ALL_AMENITIES,
  getAmenityIcon,
  getAmenityLabel,
  getDisplayAmenities,
} from "@/lib/icons";
import { cn } from "@/lib/utils";
import type { Restroom } from "@/types/restroom";
import type { Review } from "@/types/review";
import { useI18n } from "@/hooks/use-i18n";

interface RestroomDetailProps {
  restroom: Restroom;
  /** Decided on the server from the validated session. */
  isOwner: boolean;
  /** Signed-in user's id; null for guests */
  viewerId: string | null;
  /** The viewer already confirmed this restroom exists */
  initialVerified: boolean;
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
export function RestroomDetail({ restroom, isOwner, viewerId, initialVerified, reviews }: RestroomDetailProps) {
  const router = useRouter();
  const nav = useNavigation();
  const { t, locale } = useI18n();
  // Moderation status + confirmations; updated in place after a vote
  const [community, setCommunity] = useState({
    status: restroom.status ?? "approved",
    verifiedCount: restroom.verifiedCount ?? 0,
  });

  // Hero parallax: the decorative layer drifts down and fades as the page scrolls
  const scrollY = useMainScrollY();
  const decoY = useTransform(scrollY, [0, 240], [0, 72]);
  const decoOpacity = useTransform(scrollY, [0, 200], [1, 0]);

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

      {/* Hero: gradient card with a parallax toilet mark behind the title */}
      <header className="relative isolate overflow-hidden rounded-2xl border bg-gradient-to-br from-primary/15 via-primary/5 to-highlight/10 p-5 shadow-sm">
        <motion.div
          style={{ y: decoY, opacity: decoOpacity }}
          className="pointer-events-none absolute -right-6 -top-6 -z-10 text-primary/10"
          aria-hidden="true"
        >
          <Toilet className="h-40 w-40" strokeWidth={1.5} />
        </motion.div>
        <motion.div
          variants={slideUp}
          initial="hidden"
          animate="visible"
          className="flex flex-col gap-2"
        >
          <div className="flex flex-wrap gap-1.5">
            <RestroomStatusBadge status={community.status} />
            {isOwner && <UserAddedBadge label={t.restroom.yourContribution} />}
          </div>
          <h1 className="text-2xl font-bold leading-tight">{restroom.name}</h1>
          <div className="flex flex-wrap items-center gap-2">
            <a href="#reviews" className="link-underline rounded-sm">
              <RestroomRating rating={restroom.rating} reviewCount={restroom.reviewCount} />
            </a>
            <PriceBadge isFree={restroom.isFree} />
          </div>
          <p className="flex items-start gap-1.5 text-sm text-muted-foreground">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            {restroom.address}
          </p>
          <DistanceFromUser latitude={restroom.latitude} longitude={restroom.longitude} />
        </motion.div>
      </header>

      {/* `isolate` keeps Leaflet's z-indexes from covering the header/nav/toasts */}
      {/* Grows to show the route preview */}
      <div
        className={cn(
          "relative isolate overflow-hidden rounded-xl border shadow-sm transition-[height] duration-300 ease-out",
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
              {t.restroom.backToNavigation}
            </Link>
          </Button>
        ) : (
          <NavigateButton destination={destination} pulse />
        )}
        <ShareButton />
      </div>

      {/* Community verification ("Nakita ko na ito") */}
      <section
        aria-labelledby="verify-heading"
        className="flex flex-col gap-2 rounded-xl border bg-card p-3 shadow-sm"
      >
        <h2 id="verify-heading" className="text-sm font-semibold">
          {t.moderation.verify.question}
        </h2>
        <p className="text-xs text-muted-foreground">{t.moderation.statusHint[community.status]}</p>
        <VerifyButton
          restroomId={restroom.id}
          status={community.status}
          verifiedCount={community.verifiedCount}
          initialVerified={initialVerified}
          viewerId={viewerId}
          isOwner={isOwner}
          onChange={setCommunity}
        />
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-semibold">{t.restroom.amenities}</h2>
        {/* Shows every amenity type so it's clear what's missing too (e.g. walang bidet) */}
        <motion.ul
          className="grid grid-cols-2 gap-2"
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
        >
          {getDisplayAmenities(ALL_AMENITIES).map((amenity) => {
            const Icon = getAmenityIcon(amenity);
            const available = restroom.amenities.includes(amenity);
            return (
              <motion.li
                key={amenity}
                variants={staggerItem}
                className={cn(
                  // Solid card background: the paper-map pattern must not show through the text
                  "flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-sm",
                  available
                    ? "border-primary/40 font-medium"
                    : "text-muted-foreground"
                )}
              >
                <Icon
                  className={cn("h-4 w-4 shrink-0", available && "text-primary")}
                  aria-hidden="true"
                />
                <span className={cn(!available && "line-through")}>{getAmenityLabel(amenity, locale)}</span>
                <span className="sr-only">{available ? t.restroom.available : t.restroom.unavailable}</span>
              </motion.li>
            );
          })}
        </motion.ul>
      </section>

      {restroom.description && (
        <section className="flex flex-col gap-2">
          <h2 className="font-semibold">{t.restroom.description}</h2>
          <p className="whitespace-pre-line text-sm leading-relaxed">{restroom.description}</p>
        </section>
      )}

      {/* ODbL attribution for restrooms imported from OpenStreetMap */}
      {restroom.source === "osm" && (
        <p className="text-xs text-muted-foreground">
          {t.restroom.osmSource}{" "}
          <a
            href="https://www.openstreetmap.org/copyright"
            target="_blank"
            rel="noopener noreferrer"
            className="link-underline"
          >
            {t.restroom.osmAttribution}
            <span className="sr-only"> {t.common.newTab}</span>
          </a>
        </p>
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

      {!isOwner && (
        <ReportButton targetType="restroom" targetId={restroom.id} viewerId={viewerId} className="self-center" />
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

