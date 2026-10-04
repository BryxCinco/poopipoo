import {
  Accessibility,
  Baby,
  BadgeCheck,
  Droplets,
  ScrollText,
  ShowerHead,
  Snowflake,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

import type { Amenity } from "@/types/restroom";

// Display label + icon for each amenity (Filipino + English UI).
export const AMENITY_CONFIG: Record<Amenity, { label: string; icon: LucideIcon }> = {
  bidet: { label: "Bidet", icon: Droplets },
  tissue: { label: "Tissue", icon: ScrollText },
  soap: { label: "Sabon", icon: Sparkles },
  wheelchair: { label: "PWD accessible", icon: Accessibility },
  "baby-changing": { label: "Baby changing", icon: Baby },
  shower: { label: "Shower", icon: ShowerHead },
  "air-conditioned": { label: "Aircon", icon: Snowflake },
  free: { label: "Libre", icon: BadgeCheck },
};
