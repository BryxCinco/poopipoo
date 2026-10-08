import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { RestroomDetail } from "@/components/restroom/RestroomDetail";
import type { ReviewViewer } from "@/components/restroom/ReviewsSection";
import { getCurrentUser } from "@/lib/auth/server";
import { getT } from "@/lib/i18n/server";
import { getSiteUrl, pageMetadata } from "@/lib/metadata";
import { restroomJsonLd, toJsonLdScript } from "@/lib/structured-data";
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
  return pageMetadata({
    title: restroom.name,
    description:
      [restroom.description, restroom.address].filter(Boolean).join(" ") || getT().meta.restroomFallbackDescription,
    path: `/restroom/${restroom.id}`,
  });
}

// Server-rendered from Supabase. Unknown ids show the not-found page with a
// "noindex" robots tag. Note: since Phase 10 the root app/loading.tsx wraps this
// route, so Next starts streaming (status 200) before notFound() runs; the
// HTTP status is 200 instead of 404 (a "soft 404"). Same UI for users.
export default async function RestroomPage({ params, searchParams }: RestroomPageProps) {
  const [restroom, user] = await Promise.all([
    getRestroomByIdServer(params.id),
    getCurrentUser(),
  ]);
  if (!restroom) notFound();

  const supabase = createClient();

  // Reviews are secondary: if they fail to load, still show the restroom and
  // let the reviews section offer a retry instead of failing the whole page.
  const [profileResult, myReviewResult, othersResult, verifiedResult] = await Promise.allSettled([
    user ? supabase.from("profiles").select("username, avatar_url").eq("id", user.id).maybeSingle() : null,
    user ? fetchUserReview(supabase, restroom.id, user.id) : null,
    fetchReviewsPage(supabase, restroom.id, 0, user?.id ?? null),
    // Did the viewer already confirm this restroom? ("Nakita ko na ito")
    user
      ? supabase
          .from("restroom_verifications")
          .select("restroom_id")
          .eq("restroom_id", restroom.id)
          .eq("user_id", user.id)
          .maybeSingle()
      : null,
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
  const initialVerified =
    verifiedResult.status === "fulfilled" && verifiedResult.value !== null && verifiedResult.value.data !== null;

  const jsonLd = toJsonLdScript(restroomJsonLd(restroom, new URL(`/restroom/${restroom.id}`, getSiteUrl()).toString()));

  return (
    <>
    {/* schema.org PublicToilet for search engines (see lib/structured-data.ts) */}
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
    <RestroomDetail
      restroom={restroom}
      isOwner={user !== null && restroom.createdBy === user.id}
      viewerId={user?.id ?? null}
      initialVerified={initialVerified}
      reviews={{
        viewer,
        initialMyReview: myReview,
        initialReviews: others ? others.reviews : null,
        initialTotal: others ? others.total : 0,
        // /restroom/[id]?review=edit (from the profile's "I-edit" link)
        startEditing: searchParams.review === "edit",
      }}
    />
    </>
  );
}
