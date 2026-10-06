"use client";

import { Navigation } from "lucide-react";

import { AnimatedButton } from "@/components/ui/AnimatedButton";
import { useGeolocation } from "@/hooks/use-geolocation";
import { useNavigation } from "@/hooks/use-navigation";
import { useToast } from "@/hooks/use-toast";
import type { NavigationDestination } from "@/lib/navigation-store";
import { cn } from "@/lib/utils";

interface NavigateButtonProps {
  destination: NavigationDestination;
  /** Called once the route request has started (e.g. to close a sheet) */
  onPlanned?: () => void;
  /** Soft pulsing ring to draw attention (the main action on the detail page) */
  pulse?: boolean;
  className?: string;
}

/**
 * Gets the user's location, then plans a route to the restroom (preview).
 * Unlike "Near Me", there's no Manila fallback: a route needs a real origin.
 */
export function NavigateButton({ destination, onPlanned, pulse = false, className }: NavigateButtonProps) {
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
    <span className={cn("relative block w-full", className)}>
      {pulse && !busy && (
        <span className="absolute inset-0 animate-pulse-ring rounded-xl bg-primary/40" aria-hidden="true" />
      )}
      <AnimatedButton
        type="button"
        size="lg"
        onClick={() => void handleClick()}
        loading={busy}
        loadingText={loading ? "Hinahanap ka..." : "Navigate"}
        className="relative w-full"
      >
        <Navigation aria-hidden="true" />
        Navigate
      </AnimatedButton>
    </span>
  );
}
