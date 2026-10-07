"use client";

import { Navigation } from "lucide-react";

import { AnimatedButton } from "@/components/ui/AnimatedButton";
import { useGeolocation } from "@/hooks/use-geolocation";
import { useI18n } from "@/hooks/use-i18n";
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
  const { t } = useI18n();
  const busy = loading || (nav.status === "routing" && nav.destination?.id === destination.id);

  const handleClick = async () => {
    const location = await requestLocation();
    if (!location.hasLocation) {
      toast({
        variant: "destructive",
        title: t.navigation.locationNeeded,
        description: location.error ?? t.navigation.allowLocation,
      });
      return;
    }
    void nav.planRoute(destination, { latitude: location.latitude, longitude: location.longitude });
    onPlanned?.();
  };

  return (
    <span className={cn("relative block w-full", className)}>
      {pulse && !busy && (
        <span className="absolute inset-0 animate-pulse-ring rounded-xl" aria-hidden="true" />
      )}
      <AnimatedButton
        type="button"
        size="lg"
        onClick={() => void handleClick()}
        loading={busy}
        loadingText={loading ? t.navigation.findingYou : t.navigation.navigate}
        className="relative w-full"
      >
        <Navigation aria-hidden="true" />
        {t.navigation.navigate}
      </AnimatedButton>
    </span>
  );
}
