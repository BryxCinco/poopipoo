import { BadgeCheck, CircleDollarSign } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { getAmenityIcon, getAmenityLabel } from "@/lib/icons";
import { cn } from "@/lib/utils";
import type { Amenity } from "@/types/restroom";

export function PriceBadge({ isFree, className }: { isFree: boolean; className?: string }) {
  const Icon = isFree ? BadgeCheck : CircleDollarSign;
  return (
    <Badge variant={isFree ? "secondary" : "outline"} className={cn("gap-1", className)}>
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {isFree ? "Libre" : "May bayad"}
    </Badge>
  );
}

export function AmenityBadge({ amenity, className }: { amenity: Amenity; className?: string }) {
  const Icon = getAmenityIcon(amenity);
  return (
    <Badge variant="outline" className={cn("gap-1 font-normal", className)}>
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {getAmenityLabel(amenity)}
    </Badge>
  );
}
