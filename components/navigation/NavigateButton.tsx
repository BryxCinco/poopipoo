"use client";

import { Loader2, Navigation } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useGeolocation } from "@/hooks/use-geolocation";
import { useNavigation } from "@/hooks/use-navigation";
import { useToast } from "@/hooks/use-toast";
import type { NavigationDestination } from "@/lib/navigation-store";
import { cn } from "@/lib/utils";

interface NavigateButtonProps {
  destination: NavigationDestination;
  /** Called once the route request has started (e.g. to close a sheet) */
  onPlanned?: () => void;
  className?: string;
}

/**
 * Gets the user's location, then plans a route to the restroom (preview).
 * Unlike "Near Me", there's no Manila fallback: a route needs a real origin.
 */
export function NavigateButton({ destination, onPlanned, className }: NavigateButtonProps) {
  const { toast } = useToast();
  const { loading, requestLocation } = useGeolocation();
  const nav = useNavigation();
  const busy = loading || (nav.status === "routing" && nav.destination?.id === destination.id);

  const handleClick = async () => {
    const location = await requestLocation();
    if (!location.hasLocation) {
      toast({
        variant: "destructive",
        title: "Kailangan ang location mo",
        description: location.error ?? "Payagan ang location access para makapag-navigate.",
      });
      return;
    }
    void nav.planRoute(destination, { latitude: location.latitude, longitude: location.longitude });
    onPlanned?.();
  };

  return (
    <Button type="button" size="lg" onClick={() => void handleClick()} disabled={busy} className={cn("w-full", className)}>
      {busy ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Navigation aria-hidden="true" />}
      {loading ? "Hinahanap ka..." : "Navigate"}
    </Button>
  );
}
