"use client";

import { useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Car,
  ChevronDown,
  ChevronUp,
  Clock,
  Flag,
  Footprints,
  Loader2,
  MessageSquare,
  Play,
  RefreshCw,
  Volume2,
  VolumeX,
  X,
  type LucideIcon,
} from "lucide-react";

import { ManeuverIcon } from "@/components/navigation/ManeuverIcon";
import { Button } from "@/components/ui/button";
import type { NavigationProgress } from "@/lib/navigation-progress";
import type { NavigationState } from "@/lib/navigation-store";
import type { RouteProfile } from "@/lib/routing";
import { formatArrivalTime, formatDuration, formatMeters } from "@/lib/routing-translations";
import { cn } from "@/lib/utils";
import { isSpeechSupported } from "@/lib/voice";

interface NavigationPanelProps {
  nav: NavigationState;
  /** Live progress while navigating (null in preview or before the first GPS fix) */
  progress: NavigationProgress | null;
  gpsError?: string | null;
  gpsLoading?: boolean;
  onStart: () => void;
  onStop: () => void;
  onRetry: () => void;
  onProfileChange: (profile: RouteProfile) => void;
  onVoiceChange: (enabled: boolean) => void;
  /** Positioning is up to the page (absolute over a map, or fixed above the nav bar) */
  className?: string;
}

const PROFILES: { value: RouteProfile; label: string; icon: LucideIcon }[] = [
  { value: "foot", label: "Lakad", icon: Footprints },
  { value: "car", label: "Sasakyan", icon: Car },
];

/**
 * Non-modal bottom panel: the map behind it stays usable while navigating.
 * Shows the route summary, turn-by-turn steps and Simulan/Itigil controls.
 */
export function NavigationPanel({
  nav,
  progress,
  gpsError = null,
  gpsLoading = false,
  onStart,
  onStop,
  onRetry,
  onProfileChange,
  onVoiceChange,
  className,
}: NavigationPanelProps) {
  const [stepsOpen, setStepsOpen] = useState(false);
  const { status, route, destination } = nav;
  if (status === "idle" || !destination) return null;

  const navigating = status === "navigating";
  const remainingDistance = navigating && progress ? progress.remainingDistance : (route?.distance ?? 0);
  const remainingDuration = navigating && progress ? progress.remainingDuration : (route?.duration ?? 0);
  const currentStep = navigating && progress ? progress.stepIndex : -1;
  const nextStep =
    navigating && progress && route && progress.nextStepIndex !== null ? route.steps[progress.nextStepIndex] : null;

  return (
    <section
      aria-label="Navigation"
      className={cn(
        "flex max-h-[60dvh] flex-col rounded-t-2xl border-t bg-background shadow-[0_-4px_20px_rgba(0,0,0,0.15)]",
        className
      )}
    >
      <div className="mx-auto mt-2 h-1.5 w-10 shrink-0 rounded-full bg-muted" aria-hidden="true" />

      {/* Destination + close */}
      <div className="flex shrink-0 items-center gap-2 px-4 pb-2 pt-1">
        <Flag className="h-4 w-4 shrink-0 text-[#8B4513]" aria-hidden="true" />
        <p className="min-w-0 flex-1 truncate text-sm font-semibold">{destination.name}</p>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="-mr-2 h-8 w-8"
          onClick={onStop}
          aria-label="Itigil ang navigation"
        >
          <X aria-hidden="true" />
        </Button>
      </div>

      <div className="flex min-h-0 flex-col gap-3 overflow-y-auto px-4 pb-4">
        {/* Upcoming maneuver (big banner while navigating) */}
        {navigating && (
          <div className="flex items-center gap-3 rounded-lg bg-[#8B4513] p-3 text-white" aria-live="polite">
            {gpsLoading && !progress ? (
              <>
                <Loader2 className="h-7 w-7 shrink-0 animate-spin" aria-hidden="true" />
                <p className="font-semibold">Hinahanap ang GPS signal...</p>
              </>
            ) : nextStep && progress ? (
              <>
                <ManeuverIcon maneuver={nextStep.maneuver} className="h-8 w-8" />
                <div className="min-w-0">
                  <p className="text-xl font-bold leading-tight">{formatMeters(progress.distanceToNextManeuver)}</p>
                  <p className="truncate text-sm">{nextStep.instruction}</p>
                </div>
              </>
            ) : (
              <p className="font-semibold">Sundan ang ruta</p>
            )}
          </div>
        )}

        {status === "arrived" && (
          <div className="flex items-center gap-3 rounded-lg bg-green-600 p-3 text-white" role="status">
            <Flag className="h-7 w-7 shrink-0" aria-hidden="true" />
            <p className="font-semibold">Nakarating ka na!</p>
          </div>
        )}

        {status === "routing" && (
          <p className="flex items-center gap-2 py-2 text-sm text-muted-foreground" role="status">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Hinahanap ang daan papunta sa CR...
          </p>
        )}

        {status === "error" && (
          <div className="flex flex-col gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive" role="alert">
            <p className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              {nav.error}
            </p>
            <Button type="button" variant="outline" size="sm" onClick={onRetry} className="w-fit">
              <RefreshCw aria-hidden="true" />
              Subukan ulit
            </Button>
          </div>
        )}

        {/* Summary + directions (not needed once arrived) */}
        {route && (status === "preview" || status === "navigating") && (
          <>
            {/* Summary: time, distance, arrival */}
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <p className="flex items-center gap-1.5 text-xl font-bold text-[#8B4513]">
                <Clock className="h-5 w-5" aria-hidden="true" />
                {formatDuration(remainingDuration)}
              </p>
              <p className="text-sm font-medium">{formatMeters(remainingDistance)}</p>
              <p className="text-xs text-muted-foreground" suppressHydrationWarning>
                Darating ng {formatArrivalTime(remainingDuration)}
              </p>
            </div>

            {nav.rerouting && (
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground" role="status">
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                Naliligaw ka. Hinahanap ang bagong daan...
              </p>
            )}
            {gpsError && (
              <p className="flex items-start gap-1.5 text-xs text-destructive" role="alert">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                {gpsError}
              </p>
            )}

            {/* Lakad / Sasakyan (before starting) */}
            {status === "preview" && (
              <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Paraan ng pagbiyahe">
                {PROFILES.map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={nav.profile === value}
                    onClick={() => onProfileChange(value)}
                    className={cn(
                      "flex h-10 items-center justify-center gap-2 rounded-md border text-sm transition-colors",
                      nav.profile === value
                        ? "border-[#8B4513] bg-[#8B4513]/10 font-semibold text-[#8B4513]"
                        : "hover:bg-muted"
                    )}
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                    {label}
                  </button>
                ))}
              </div>
            )}

            {/* Turn-by-turn list (collapsible to keep the map visible) */}
            <div>
              <button
                type="button"
                onClick={() => setStepsOpen((open) => !open)}
                aria-expanded={stepsOpen}
                aria-controls="nav-steps"
                className="flex w-full items-center justify-between py-1 text-sm font-medium"
              >
                Mga direksyon ({route.steps.length})
                {stepsOpen ? (
                  <ChevronUp className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <ChevronDown className="h-4 w-4" aria-hidden="true" />
                )}
              </button>
              {stepsOpen && (
                <ol id="nav-steps" className="mt-1 flex max-h-56 flex-col divide-y overflow-y-auto rounded-md border">
                  {route.steps.map((step, i) => (
                    <li
                      key={i}
                      aria-current={i === currentStep ? "step" : undefined}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 text-sm",
                        i === currentStep && "bg-[#8B4513]/10 font-semibold",
                        i < currentStep && "text-muted-foreground line-through"
                      )}
                    >
                      <ManeuverIcon maneuver={step.maneuver} className="text-[#8B4513]" />
                      <span className="min-w-0 flex-1">{step.instruction}</span>
                      {step.distance > 0 && step.maneuver !== "arrive" && (
                        <span className="shrink-0 text-xs text-muted-foreground">{formatMeters(step.distance)}</span>
                      )}
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          {status === "preview" && (
            <Button type="button" size="lg" onClick={onStart} className="flex-1">
              <Play aria-hidden="true" />
              Simulan
            </Button>
          )}
          {navigating && isSpeechSupported() && (
            <Button
              type="button"
              size="lg"
              variant="outline"
              onClick={() => onVoiceChange(!nav.voiceEnabled)}
              aria-pressed={nav.voiceEnabled}
              aria-label={nav.voiceEnabled ? "I-off ang boses" : "I-on ang boses"}
            >
              {nav.voiceEnabled ? <Volume2 aria-hidden="true" /> : <VolumeX aria-hidden="true" />}
              Boses
            </Button>
          )}
          {status === "arrived" ? (
            <>
              <Button asChild size="lg" variant="outline" className="flex-1">
                <Link href={`/restroom/${destination.id}#reviews`} onClick={onStop}>
                  <MessageSquare aria-hidden="true" />
                  Mag-review
                </Link>
              </Button>
              <Button type="button" size="lg" onClick={onStop} className="flex-1">
                Tapusin
              </Button>
            </>
          ) : (
            <Button
              type="button"
              size="lg"
              variant={status === "preview" ? "outline" : "destructive"}
              onClick={onStop}
              className="flex-1"
            >
              <X aria-hidden="true" />
              Itigil
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}
