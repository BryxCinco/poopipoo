import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database, ReviewRow } from "@/types/database";
import type { Review, ReviewInput } from "@/types/review";

/**
 * Review queries shared by the server (detail page) and the browser
 * (load more / submit). Pass in whichever Supabase client fits the context;
 * RLS decides what the current user may do.
 */

type Client = SupabaseClient<Database>;

export const REVIEWS_PAGE_SIZE = 10;
export const REVIEW_COMMENT_MAX = 500;

// Embeds the author's profile via the reviews.user_id → profiles.id foreign key
const REVIEW_SELECT =
  "id, restroom_id, user_id, rating, comment, images, created_at, profiles(username, avatar_url)";

type ReviewRowWithAuthor = ReviewRow & {
  profiles: { username: string | null; avatar_url: string | null } | null;
};

function toReview(row: ReviewRowWithAuthor): Review {
  return {
    id: row.id,
    restroomId: row.restroom_id,
    userId: row.user_id,
    rating: row.rating,
    comment: row.comment,
    images: row.images,
    createdAt: row.created_at,
    author: {
      username: row.profiles?.username ?? "User",
      avatarUrl: row.profiles?.avatar_url ?? null,
    },
  };
}

export interface ReviewsPage {
  reviews: Review[];
  /** Total matching reviews (for "Load more"). */
  total: number;
}

/**
 * One page of a restroom's reviews, newest first. `excludeUserId` leaves out
 * the viewer's own review (it's shown separately as "Iyong review").
 */
export async function fetchReviewsPage(
  supabase: Client,
  restroomId: string,
  page: number,
  excludeUserId: string | null = null
): Promise<ReviewsPage> {
  const from = page * REVIEWS_PAGE_SIZE;
  let query = supabase
    .from("reviews")
    .select(REVIEW_SELECT, { count: "exact" })
    .eq("restroom_id", restroomId)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false }) // stable order for equal timestamps
    .range(from, from + REVIEWS_PAGE_SIZE - 1);
  if (excludeUserId) query = query.neq("user_id", excludeUserId);

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);
  return { reviews: data.map(toReview), total: count ?? data.length };
}

/** The given user's review of a restroom, or null. */
export async function fetchUserReview(
  supabase: Client,
  restroomId: string,
  userId: string
): Promise<Review | null> {
  const { data, error } = await supabase
    .from("reviews")
    .select(REVIEW_SELECT)
    .eq("restroom_id", restroomId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? toReview(data) : null;
}

/** Postgres unique_violation: the user already reviewed this restroom. */
export class DuplicateReviewError extends Error {
  constructor() {
    super("May review ka na para sa CR na ito.");
    this.name = "DuplicateReviewError";
  }
}

export async function createReview(
  supabase: Client,
  restroomId: string,
  userId: string,
  input: ReviewInput
): Promise<Review> {
  const { data, error } = await supabase
    .from("reviews")
    .insert({
      restroom_id: restroomId,
      user_id: userId,
      rating: input.rating,
      comment: input.comment.trim(),
    })
    .select(REVIEW_SELECT)
    .single();
  if (error) {
    if (error.code === "23505") throw new DuplicateReviewError();
    throw new Error(error.message);
  }
  return toReview(data);
}

export async function updateReview(
  supabase: Client,
  reviewId: string,
  input: ReviewInput
): Promise<Review> {
  const { data, error } = await supabase
    .from("reviews")
    .update({ rating: input.rating, comment: input.comment.trim() })
    .eq("id", reviewId)
    .select(REVIEW_SELECT)
    .maybeSingle();
  if (error) throw new Error(error.message);
  // RLS hides rows you don't own, so "no row" means it's gone or not yours
  if (!data) throw new Error("Hindi na mahanap ang review mo. Baka nabura na.");
  return toReview(data);
}

export async function deleteReview(supabase: Client, reviewId: string): Promise<void> {
  const { data, error } = await supabase.from("reviews").delete().eq("id", reviewId).select("id");
  if (error) throw new Error(error.message);
  if (data.length === 0) throw new Error("Hindi mabura ang review. Baka nabura na ito.");
}
