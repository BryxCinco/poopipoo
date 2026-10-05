import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { RestroomDetail } from "@/components/restroom/RestroomDetail";
import { getCurrentUser } from "@/lib/auth/server";
import { getRestroomByIdServer } from "@/lib/restrooms/server";

interface RestroomPageProps {
  params: { id: string };
}

export async function generateMetadata({ params }: RestroomPageProps): Promise<Metadata> {
  const restroom = await getRestroomByIdServer(params.id);
  if (!restroom) notFound();
  return {
    title: `Poopipoo — ${restroom.name}`,
    description: [restroom.description, restroom.address].filter(Boolean).join(" "),
  };
}

// Server-rendered from Supabase: unknown ids get a real 404 status.
// Note: no loading.tsx for this route on purpose. A loading boundary makes Next
// start streaming (status 200) before notFound() runs, losing the 404.
export default async function RestroomPage({ params }: RestroomPageProps) {
  const [restroom, user] = await Promise.all([
    getRestroomByIdServer(params.id),
    getCurrentUser(),
  ]);
  if (!restroom) notFound();

  const isOwner = user !== null && restroom.createdBy === user.id;
  return <RestroomDetail restroom={restroom} isOwner={isOwner} />;
}
