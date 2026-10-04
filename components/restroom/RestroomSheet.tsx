"use client";

import { MapPin, Navigation } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { AMENITY_CONFIG } from "@/components/restroom/amenities";
import { StarRating } from "@/components/restroom/StarRating";
import type { Restroom } from "@/types/restroom";

interface RestroomSheetProps {
  restroom: Restroom | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function getDirectionsUrl({ latitude, longitude }: Restroom): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
}

export function RestroomSheet({ restroom, open, onOpenChange }: RestroomSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="max-h-[85dvh] overflow-y-auto rounded-t-2xl pb-[calc(1.5rem+env(safe-area-inset-bottom))]"
      >
        {restroom && (
          <div className="mx-auto flex w-full max-w-screen-md flex-col gap-4">
            <SheetHeader className="space-y-2 text-left">
              <SheetTitle className="pr-6 text-2xl font-bold">{restroom.name}</SheetTitle>
              <div className="flex flex-wrap items-center gap-2">
                <StarRating rating={restroom.rating} />
                <span className="text-sm font-medium">{restroom.rating.toFixed(1)}</span>
                <span className="text-sm text-muted-foreground">
                  ({restroom.reviewCount} reviews)
                </span>
                <Badge variant={restroom.isFree ? "secondary" : "outline"}>
                  {restroom.isFree ? "Libre" : "May bayad"}
                </Badge>
              </div>
              <SheetDescription className="flex items-start gap-1.5">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                {restroom.address}
              </SheetDescription>
            </SheetHeader>

            <div className="flex flex-wrap gap-2">
              {restroom.amenities.map((amenity) => {
                const { label, icon: Icon } = AMENITY_CONFIG[amenity];
                return (
                  <Badge key={amenity} variant="outline" className="gap-1 py-1">
                    <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                    {label}
                  </Badge>
                );
              })}
            </div>

            <p className="text-sm leading-relaxed">{restroom.description}</p>

            <Button asChild size="lg" className="w-full">
              <a href={getDirectionsUrl(restroom)} target="_blank" rel="noopener noreferrer">
                <Navigation aria-hidden="true" />
                Get Directions
              </a>
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
