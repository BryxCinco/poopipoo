"use client";

import dynamic from "next/dynamic";

import { Skeleton } from "@/components/ui/skeleton";

// Client wrapper so Server Components can render the mini map:
// `ssr: false` must be used from a Client Component, and Leaflet needs `window`.
const MiniMap = dynamic(() => import("@/components/map/MiniMap"), {
  ssr: false,
  loading: () => <Skeleton className="h-full w-full rounded-none" />,
});

export { MiniMap as MiniMapLoader };
