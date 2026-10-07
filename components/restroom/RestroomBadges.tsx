"use client";

import { BadgeCheck, CircleDollarSign, UserRound } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/hooks/use-i18n";
import { getAmenityIcon, getAmenityLabel } from "@/lib/icons";
import { cn } from "@/lib/utils";
import type { Amenity } from "@/types/restroom";

export function PriceBadge({ isFree, className }: { isFree: boolean; className?: string }) {
  const Icon = isFree ? BadgeCheck : CircleDollarSign;
  const { t } = useI18n();
  return (
    <Badge variant={isFree ? "secondary" : "outline"} className={cn("gap-1", className)}>
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {isFree ? t.restroom.free : t.restroom.paid}
    </Badge>
  );
}

export function AmenityBadge({ amenity, className }: { amenity: Amenity; className?: string }) {
  const Icon = getAmenityIcon(amenity);
  const { locale } = useI18n();
  return (
    <Badge variant="outline" className={cn("gap-1 font-normal", className)}>
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {getAmenityLabel(amenity, locale)}
    </Badge>
  );
}

/** Marks restrooms the user added on this device. */
export function UserAddedBadge({
  label,
  className,
}: {
  /** Defaults to "Iyong CR" / "Your restroom" */
  label?: string;
  className?: string;
}) {
  const { t } = useI18n();
  return (
    <Badge className={cn("gap-1 border-transparent bg-highlight/15 text-foreground hover:bg-highlight/15", className)}>
      <UserRound className="h-3.5 w-3.5" aria-hidden="true" />
      {label ?? t.restroom.yours}
    </Badge>
  );
}
