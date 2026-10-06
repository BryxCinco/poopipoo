import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { RestroomDetail } from "@/components/restroom/RestroomDetail";
import type { ReviewViewer } from "@/components/restroom/ReviewsSection";
import { getCurrentUser } from "@/lib/auth/server";
import { getRestroomByIdServer } from "@/lib/restrooms/server";
import { fetchReviewsPage, fetchUserReview } from "@/lib/reviews/queries";
import { createClient } from "@/lib/supabase/server";
import type { Review } from "@/types/review";

interface RestroomPageProps {
  params: { id: string };
  searchParams: { review?: string | string[] };
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
export default async function RestroomPage({ params, searchParams }: RestroomPageProps) {
  const [restroom, user] = await Promise.all([
    getRestroomByIdServer(params.id),
    getCurrentUser(),
  ]);
  if (!restroom) notFound();

  const supabase = createClient();

  // Reviews are secondary: if they fail to load, still show the restroom and
  // let the reviews section offer a retry instead of failing the whole page.
  const [profileResult, myReviewResult, othersResult] = await Promise.allSettled([
    user ? supabase.from("profiles").select("username, avatar_url").eq("id", user.id).maybeSingle() : null,
    user ? fetchUserReview(supabase, restroom.id, user.id) : null,
    fetchReviewsPage(supabase, restroom.id, 0, user?.id ?? null),
  ]);

  const profile =
    profileResult.status === "fulfilled" && profileResult.value ? profileResult.value.data : null;
  const viewer: ReviewViewer | null = user
    ? {
        id: user.id,
        username: profile?.username ?? user.email?.split("@")[0] ?? "User",
        avatarUrl: profile?.avatar_url ?? null,
      }
    : null;
  const myReview: Review | null = myReviewResult.status === "fulfilled" ? myReviewResult.value : null;
  const others = othersResult.status === "fulfilled" ? othersResult.value : null;

  return (
    <RestroomDetail
      restroom={restroom}
      isOwner={user !== null && restroom.createdBy === user.id}
      reviews={{
        viewer,
        initialMyReview: myReview,
        initialReviews: others ? others.reviews : null,
        initialTotal: others ? others.total : 0,
        // /restroom/[id]?review=edit (from the profile's "I-edit" link)
        startEditing: searchParams.review === "edit",
      }}
    />
  );
}
