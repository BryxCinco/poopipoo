"use client";

import Link from "next/link";
import { ChevronRight, MapPin } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  AmenityBadge,
  PriceBadge,
  UserAddedBadge,
} from "@/components/restroom/RestroomBadges";
import { RestroomStatusBadge } from "@/components/moderation/RestroomStatusBadge";
import { RestroomRating } from "@/components/restroom/RestroomRating";
import { NavigateButton } from "@/components/navigation/NavigateButton";
import { getDisplayAmenities } from "@/lib/icons";
import type { Restroom } from "@/types/restroom";
import { useI18n } from "@/hooks/use-i18n";

interface RestroomSheetProps {
  restroom: Restroom | null;
  isUserAdded?: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RestroomSheet({
  restroom,
  isUserAdded = false,
  open,
  onOpenChange,
}: RestroomSheetProps) {
  const { t } = useI18n();
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="max-h-[85dvh] overflow-y-auto rounded-t-2xl pb-[calc(1.5rem+env(safe-area-inset-bottom))]"
      >
        {restroom && (
          <div className="mx-auto flex w-full max-w-screen-md flex-col gap-4">
            <SheetHeader className="space-y-2 text-left">
              {(isUserAdded || (restroom.status && restroom.status !== "approved")) && (
                <div className="flex flex-wrap gap-1.5">
                  {restroom.status && restroom.status !== "approved" && <RestroomStatusBadge status={restroom.status} />}
                  {isUserAdded && <UserAddedBadge label={t.restroom.yourContribution} />}
                </div>
              )}
              <SheetTitle className="pr-6 text-2xl font-bold">{restroom.name}</SheetTitle>
              <div className="flex flex-wrap items-center gap-2">
                <RestroomRating rating={restroom.rating} reviewCount={restroom.reviewCount} />
                <PriceBadge isFree={restroom.isFree} />
              </div>
              <SheetDescription className="flex items-start gap-1.5">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                {restroom.address}
              </SheetDescription>
            </SheetHeader>

            <div className="flex flex-wrap gap-2">
              {getDisplayAmenities(restroom.amenities).map((amenity) => (
                <AmenityBadge key={amenity} amenity={amenity} className="py-1" />
              ))}
            </div>

            {restroom.description && (
              <p className="whitespace-pre-line text-sm leading-relaxed">{restroom.description}</p>
            )}

            <div className="flex flex-col gap-2">
              {/* Plans a route on this map; the sheet closes so the route is visible */}
              <NavigateButton
                destination={{
                  id: restroom.id,
                  name: restroom.name,
                  latitude: restroom.latitude,
                  longitude: restroom.longitude,
                }}
                onPlanned={() => onOpenChange(false)}
              />
              <Button asChild size="lg" variant="outline" className="w-full">
                <Link href={`/restroom/${restroom.id}`}>
                  {t.restroom.viewFullDetails}
                  <ChevronRight aria-hidden="true" />
                </Link>
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
