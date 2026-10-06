import {
  ArrowUp,
  ArrowUpLeft,
  ArrowUpRight,
  CornerUpLeft,
  CornerUpRight,
  Flag,
  Navigation,
  RotateCw,
  Undo2,
  type LucideIcon,
} from "lucide-react";

import type { Maneuver } from "@/lib/routing-translations";
import { cn } from "@/lib/utils";

const ICONS: Record<Maneuver, LucideIcon> = {
  depart: Navigation,
  arrive: Flag,
  "turn-left": CornerUpLeft,
  "turn-right": CornerUpRight,
  "slight-left": ArrowUpLeft,
  "slight-right": ArrowUpRight,
  "sharp-left": CornerUpLeft,
  "sharp-right": CornerUpRight,
  uturn: Undo2,
  continue: ArrowUp,
  "keep-left": ArrowUpLeft,
  "keep-right": ArrowUpRight,
  roundabout: RotateCw,
};

export function ManeuverIcon({ maneuver, className }: { maneuver: Maneuver; className?: string }) {
  const Icon = ICONS[maneuver];
  return <Icon className={cn("h-5 w-5 shrink-0", className)} aria-hidden="true" />;
}
