import type { Metadata } from "next";

import { RestroomDetail } from "@/components/restroom/RestroomDetail";
import { getMockRestroomById, MOCK_RESTROOMS } from "@/lib/mock-restrooms";

interface RestroomPageProps {
  params: { id: string };
}

// Pre-render mock restrooms at build time. Other ids (user-added restrooms that
// live in localStorage) render on demand and are resolved on the client.
export function generateStaticParams(): RestroomPageProps["params"][] {
  return MOCK_RESTROOMS.map((restroom) => ({ id: restroom.id }));
}

export function generateMetadata({ params }: RestroomPageProps): Metadata {
  const restroom = getMockRestroomById(params.id);
  if (!restroom) {
    // Server can't see localStorage; RestroomDetail sets the real title on the client.
    return { title: "Poopipoo — CR" };
  }
  return {
    title: `Poopipoo — ${restroom.name}`,
    description: `${restroom.description} ${restroom.address}`,
  };
}

export default function RestroomPage({ params }: RestroomPageProps) {
  return <RestroomDetail id={params.id} />;
}
