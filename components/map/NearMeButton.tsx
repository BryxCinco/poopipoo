"use client";

import { Loader2, MapPin } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useGeolocation } from "@/hooks/use-geolocation";
import { useI18n } from "@/hooks/use-i18n";
import { useToast } from "@/hooks/use-toast";
import { format } from "@/lib/i18n/format";
import { cn } from "@/lib/utils";

export interface LocateResult {
  latitude: number;
  longitude: number;
  /** True when we fell back to Manila because getting the location failed. */
  isFallback: boolean;
}

interface NearMeButtonProps {
  onLocate: (result: LocateResult) => void;
  className?: string;
}

export function NearMeButton({ onLocate, className }: NearMeButtonProps) {
  const { loading, requestLocation } = useGeolocation();
  const { toast } = useToast();
  const { t } = useI18n();

  const handleClick = async () => {
    const result = await requestLocation();

    if (result.error) {
      toast({
        variant: "destructive",
        title: t.map.locationErrorTitle,
        description: format(t.map.showingManila, { error: result.error }),
      });
    }

    onLocate({
      latitude: result.latitude,
      longitude: result.longitude,
      isFallback: result.error !== null,
    });
  };

  return (
    <Button
      type="button"
      variant="secondary"
      onClick={handleClick}
      disabled={loading}
      aria-busy={loading}
      className={cn("rounded-full bg-background shadow-lg hover:bg-muted", className)}
    >
      {loading ? (
        <>
          <Loader2 className="animate-spin" aria-hidden="true" />
          {t.map.locating}
        </>
      ) : (
        <>
          <MapPin className="text-destructive" aria-hidden="true" />
          {t.map.nearMe}
        </>
      )}
    </Button>
  );
}
