"use client";

import { Loader2, MapPin } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useGeolocation } from "@/hooks/use-geolocation";
import { useToast } from "@/hooks/use-toast";
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

  const handleClick = async () => {
    const result = await requestLocation();

    if (result.error) {
      toast({
        variant: "destructive",
        title: "Hindi makuha ang location",
        description: `${result.error} Ipinapakita muna ang Manila.`,
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
          Hinahanap...
        </>
      ) : (
        <>
          <MapPin className="text-red-600" aria-hidden="true" />
          Near Me
        </>
      )}
    </Button>
  );
}
