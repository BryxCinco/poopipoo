"use client";

import { Navigation } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { useGeolocation } from "@/hooks/use-geolocation";
import { useI18n } from "@/hooks/use-i18n";
import { calculateDistance, formatDistance } from "@/lib/distance";
import { format } from "@/lib/i18n/format";

interface DistanceFromUserProps {
  latitude: number;
  longitude: number;
}

/** "2.3 km mula sa'yo". Renders nothing if the user's location isn't available. */
export function DistanceFromUser({ latitude, longitude }: DistanceFromUserProps) {
  const user = useGeolocation({ requestOnMount: true });
  const { t } = useI18n();

  if (user.loading) {
    return <Skeleton className="h-5 w-32" />;
  }

  if (!user.hasLocation) {
    return null;
  }

  const km = calculateDistance(user.latitude, user.longitude, latitude, longitude);

  return (
    <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
      <Navigation className="h-4 w-4 shrink-0" aria-hidden="true" />
      {format(t.restroom.distanceFromYou, { distance: formatDistance(km) })}
    </p>
  );
}
