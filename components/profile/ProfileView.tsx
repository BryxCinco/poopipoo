"use client";

import Link from "next/link";
import {
  Award,
  ChevronRight,
  Globe,
  Info,
  LogIn,
  MapPin,
  MessageSquare,
  Moon,
  Plus,
  Toilet,
  User,
  type LucideIcon,
} from "lucide-react";

import { DeleteRestroomButton } from "@/components/restroom/DeleteRestroomButton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useRestrooms } from "@/hooks/use-restrooms";
import { useToast } from "@/hooks/use-toast";

const SETTINGS: { label: string; icon: LucideIcon }[] = [
  { label: "Language", icon: Globe },
  { label: "Dark mode", icon: Moon },
  { label: "About", icon: Info },
];

export function ProfileView() {
  const { userRestrooms, loading } = useRestrooms();
  const { toast } = useToast();

  const comingSoon = (title: string) =>
    toast({ title, description: "Malapit na ito sa susunod na update." });

  const stats: { label: string; value: number; icon: LucideIcon }[] = [
    { label: "Mga naidagdag na CR", value: userRestrooms.length, icon: Toilet },
    { label: "Mga review", value: 0, icon: MessageSquare }, // Phase 6
    { label: "Points", value: 0, icon: Award }, // Phase 7
  ];

  return (
    <div className="mx-auto flex w-full max-w-screen-md flex-col gap-6 px-4 py-5">
      {/* Guest identity */}
      <section className="flex items-center gap-4">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <User className="h-8 w-8" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-bold">Guest User</h1>
          <p className="text-sm text-muted-foreground">Hindi pa naka-login</p>
        </div>
      </section>

      {/* Stats */}
      <section aria-label="Stats" className="grid grid-cols-3 gap-2">
        {stats.map(({ label, value, icon: Icon }) => (
          <div key={label} className="flex flex-col items-center gap-1 rounded-lg border p-3 text-center">
            <Icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            {loading ? (
              <Skeleton className="h-7 w-6" />
            ) : (
              <span className="text-2xl font-bold leading-none">{value}</span>
            )}
            <span className="text-[11px] leading-tight text-muted-foreground">{label}</span>
          </div>
        ))}
      </section>

      {/* User-added restrooms */}
      <section className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Aking mga CR</h2>
          {userRestrooms.length > 0 && (
            <Button asChild variant="ghost" size="sm" className="h-8 px-2">
              <Link href="/add">
                <Plus aria-hidden="true" />
                Magdagdag
              </Link>
            </Button>
          )}
        </div>

        {loading ? (
          <Skeleton className="h-16 w-full" />
        ) : userRestrooms.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed px-4 py-8 text-center">
            <Toilet className="h-10 w-10 text-muted-foreground" aria-hidden="true" />
            <p className="font-medium">Wala ka pang naidagdag na CR</p>
            <p className="text-sm text-muted-foreground">
              May alam kang malinis na CR? I-share mo sa iba!
            </p>
            <Button asChild className="mt-2">
              <Link href="/add">
                <Plus aria-hidden="true" />
                Magdagdag ng CR
              </Link>
            </Button>
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {userRestrooms.map((restroom) => (
              <li key={restroom.id} className="flex items-center gap-1 rounded-lg border bg-card p-1 pl-3">
                <Link href={`/restroom/${restroom.id}`} className="flex min-w-0 flex-1 flex-col py-2">
                  <span className="truncate font-medium">{restroom.name}</span>
                  <span className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3 shrink-0" aria-hidden="true" />
                    <span className="truncate">{restroom.address}</span>
                  </span>
                </Link>
                <DeleteRestroomButton restroom={restroom} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Settings (placeholders) */}
      <section className="flex flex-col gap-2">
        <h2 className="font-semibold">Settings</h2>
        <ul className="divide-y rounded-lg border">
          {SETTINGS.map(({ label, icon: Icon }) => (
            <li key={label}>
              <button
                type="button"
                onClick={() => comingSoon(label)}
                className="flex w-full items-center gap-3 px-3 py-3 text-left text-sm hover:bg-muted/50"
              >
                <Icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                <span className="flex-1">{label}</span>
                <Badge variant="secondary" className="font-normal">
                  Soon
                </Badge>
                <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      </section>

      {/* Login placeholder until auth exists */}
      <Button size="lg" className="w-full" onClick={() => comingSoon("Mag-login")}>
        <LogIn aria-hidden="true" />
        Mag-login
      </Button>
      <p className="-mt-4 text-center text-xs text-muted-foreground">
        Naka-save lang sa device na ito ang mga CR na idinagdag mo habang guest.
      </p>
    </div>
  );
}
