"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  ChevronRight,
  Loader2,
  LogIn,
  MapPin,
  Navigation,
  RefreshCw,
  RotateCcw,
  SendHorizontal,
  Sparkles,
} from "lucide-react";

import { PriceBadge } from "@/components/restroom/RestroomBadges";
import { RestroomRating } from "@/components/restroom/RestroomRating";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useAgentChat, type ChatEntry } from "@/hooks/use-agent-chat";
import { useAuthUser } from "@/hooks/use-auth-user";
import { useGeolocation } from "@/hooks/use-geolocation";
import { useNavigation } from "@/hooks/use-navigation";
import { useToast } from "@/hooks/use-toast";
import { loginUrl } from "@/lib/auth/return-url";
import { formatDistance } from "@/lib/distance";
import type { RankedRestroom } from "@/types/agent";
import type { LatLng } from "@/types/geo";

const SUGGESTIONS = ["Saan ang pinakamalapit na CR?", "May bidet ba sa BGC?", "Libre ba ang CR sa Makati?"];
const MAX_MESSAGE_LENGTH = 500;
// Re-use a location for this long before asking the browser again
const LOCATION_MAX_AGE_MS = 2 * 60_000;

// Last known location, shared across openings of the chat
let lastLocation: { value: LatLng; at: number } | null = null;

interface AgentChatProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Poopipoo Assistant chat, as a bottom sheet. */
export function AgentChat({ open, onOpenChange }: AgentChatProps) {
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuthUser();
  const { entries, pending, sendMessage, lastUserMessage, clearChat } = useAgentChat();
  const { requestLocation } = useGeolocation();
  const nav = useNavigation();
  const [input, setInput] = useState("");
  const [locating, setLocating] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Keep the newest message in view
  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ block: "end" });
  }, [open, entries.length, pending]);

  /** The user's location if they allow it (null otherwise). Never blocks the chat. */
  const getLocation = async (): Promise<LatLng | null> => {
    if (lastLocation && Date.now() - lastLocation.at < LOCATION_MAX_AGE_MS) return lastLocation.value;
    const result = await requestLocation();
    if (!result.hasLocation) return null;
    lastLocation = { value: { latitude: result.latitude, longitude: result.longitude }, at: Date.now() };
    return lastLocation.value;
  };

  const send = async (text: string, retry = false) => {
    if (!text.trim() || pending) return;
    if (!retry) setInput("");
    const location = await getLocation();
    const result = await sendMessage(text, location, retry);
    if (!result.ok && result.error) {
      const busy = result.code === "rate_limited" || result.code === "ai_busy";
      toast({
        variant: "destructive",
        title: busy ? "Sandali lang" : "Hindi nakasagot ang AI",
        description: result.error,
      });
    }
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    void send(input);
  };

  const handleRetry = () => {
    const text = lastUserMessage();
    if (text) void send(text, true);
  };

  /** Plans a route (preview on the map) and closes the chat. */
  const handleNavigate = async (restroom: RankedRestroom) => {
    setLocating(true);
    lastLocation = null; // routing needs a fresh position
    const origin = await getLocation();
    setLocating(false);
    if (!origin) {
      toast({
        variant: "destructive",
        title: "Kailangan ang location mo",
        description: "Payagan ang location access para makapag-navigate.",
      });
      return;
    }
    void nav.planRoute(
      { id: restroom.id, name: restroom.name, latitude: restroom.latitude, longitude: restroom.longitude },
      origin
    );
    onOpenChange(false);
  };

  const signedIn = !authLoading && user !== null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="flex h-[85dvh] flex-col gap-0 rounded-t-2xl p-0 pb-[env(safe-area-inset-bottom)]"
      >
        <SheetHeader className="flex-row items-center gap-3 space-y-0 border-b px-4 py-3 pr-12 text-left">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Sparkles className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <SheetTitle className="text-base">Poopipoo Assistant</SheetTitle>
            <SheetDescription className="text-xs">AI ito, kaya puwedeng magkamali.</SheetDescription>
          </div>
          {entries.length > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={clearChat}
              disabled={pending}
              aria-label="Bagong usapan"
              className="h-8 w-8 shrink-0"
            >
              <RotateCcw aria-hidden="true" />
            </Button>
          )}
        </SheetHeader>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4" aria-live="polite">
          {entries.length === 0 ? (
            <div className="flex flex-col items-center gap-3 pt-4 text-center">
              <Sparkles className="h-10 w-10 text-primary" aria-hidden="true" />
              <p className="font-semibold">Kumusta! Saan mo kailangan ng CR?</p>
              <p className="text-sm text-muted-foreground">
                Magtanong tungkol sa mga CR: kung nasaan, kung libre, o kung may bidet.
              </p>
              {signedIn && (
                <ul className="mt-2 flex w-full flex-col gap-2">
                  {SUGGESTIONS.map((suggestion) => (
                    <li key={suggestion}>
                      <Button
                        type="button"
                        variant="outline"
                        className="h-auto w-full justify-start whitespace-normal py-2.5 text-left"
                        onClick={() => void send(suggestion)}
                        disabled={pending}
                      >
                        {suggestion}
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : (
            <ol className="flex flex-col gap-3">
              {entries.map((entry) => (
                <li key={entry.id}>
                  <MessageBubble
                    entry={entry}
                    onRetry={handleRetry}
                    retryDisabled={pending}
                    onNavigate={(restroom) => void handleNavigate(restroom)}
                    navigating={locating}
                    onOpenRestroom={() => onOpenChange(false)}
                  />
                </li>
              ))}
            </ol>
          )}

          {pending && (
            <p role="status" className="mt-3 flex w-fit items-center gap-2 rounded-2xl rounded-bl-sm bg-muted px-3.5 py-2.5 text-sm">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Nag-iisip...
            </p>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input (or a login prompt for guests) */}
        <div className="border-t px-4 py-3">
          {authLoading ? null : signedIn ? (
            <form onSubmit={handleSubmit} className="flex items-center gap-2">
              <Input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Magtanong tungkol sa CR..."
                maxLength={MAX_MESSAGE_LENGTH}
                aria-label="Mensahe"
                enterKeyHint="send"
                className="h-11 flex-1 text-base"
              />
              <Button
                type="submit"
                size="icon"
                disabled={pending || input.trim().length === 0}
                aria-label="Ipadala"
                className="h-11 w-11 shrink-0"
              >
                {pending ? <Loader2 className="animate-spin" aria-hidden="true" /> : <SendHorizontal aria-hidden="true" />}
              </Button>
            </form>
          ) : (
            <div className="flex flex-col gap-2 text-center">
              <p className="text-sm text-muted-foreground">Mag-login para magamit ang AI assistant.</p>
              <Button asChild size="lg">
                <Link href={loginUrl("/")}>
                  <LogIn aria-hidden="true" />
                  Mag-login
                </Link>
              </Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

interface MessageBubbleProps {
  entry: ChatEntry;
  onRetry: () => void;
  retryDisabled: boolean;
  onNavigate: (restroom: RankedRestroom) => void;
  navigating: boolean;
  onOpenRestroom: () => void;
}

function MessageBubble({ entry, onRetry, retryDisabled, onNavigate, navigating, onOpenRestroom }: MessageBubbleProps) {
  if (entry.role === "user") {
    return (
      <p className="ml-auto w-fit max-w-[85%] whitespace-pre-line break-words rounded-2xl rounded-br-sm bg-primary px-3.5 py-2.5 text-sm text-primary-foreground">
        {entry.content}
      </p>
    );
  }

  if (entry.failed) {
    return (
      <div className="flex max-w-[85%] flex-col items-start gap-2 rounded-2xl rounded-bl-sm border border-destructive/40 bg-destructive/5 px-3.5 py-2.5 text-sm">
        <p className="text-destructive">{entry.content}</p>
        <Button type="button" size="sm" variant="outline" onClick={onRetry} disabled={retryDisabled} className="h-8">
          <RefreshCw aria-hidden="true" />
          Subukan ulit
        </Button>
      </div>
    );
  }

  const target = entry.action ? entry.restrooms?.find((restroom) => restroom.id === entry.action?.restroom_id) : undefined;

  return (
    <div className="flex flex-col gap-2">
      <p className="w-fit max-w-[85%] whitespace-pre-line break-words rounded-2xl rounded-bl-sm bg-muted px-3.5 py-2.5 text-sm">
        {entry.content}
      </p>

      {entry.restrooms && entry.restrooms.length > 0 && (
        <ul className="flex flex-col gap-2" aria-label="Mga CR">
          {entry.restrooms.map((restroom) => (
            <li key={restroom.id}>
              <RestroomCard restroom={restroom} onOpen={onOpenRestroom} />
            </li>
          ))}
        </ul>
      )}

      {target && (
        <Button type="button" onClick={() => onNavigate(target)} disabled={navigating} className="w-full">
          {navigating ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Navigation aria-hidden="true" />}
          Simulan ang navigation
        </Button>
      )}
    </div>
  );
}

function RestroomCard({ restroom, onOpen }: { restroom: RankedRestroom; onOpen: () => void }) {
  return (
    <Link
      href={`/restroom/${restroom.id}`}
      onClick={onOpen}
      className="flex items-center gap-2 rounded-lg border bg-card p-3 transition-colors hover:bg-muted/50"
    >
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="truncate font-medium">{restroom.name}</span>
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <MapPin className="h-3 w-3 shrink-0" aria-hidden="true" />
          <span className="truncate">{restroom.address}</span>
        </span>
        <div className="flex flex-wrap items-center gap-2">
          <RestroomRating rating={restroom.rating} reviewCount={restroom.reviewCount} size="sm" />
          <PriceBadge isFree={restroom.isFree} />
          {restroom.distanceKm !== null && (
            <span className="text-xs font-medium text-muted-foreground">{formatDistance(restroom.distanceKm)}</span>
          )}
        </div>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
    </Link>
  );
}
