import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database, ReviewRow } from "@/types/database";
import { LocalizedError } from "@/lib/i18n/errors";
import { toAppError } from "@/lib/moderation/errors";
import type { Review, ReviewInput } from "@/types/review";

/**
 * Review queries shared by the server (detail page) and the browser
 * (load more / submit). Pass in whichever Supabase client fits the context;
 * RLS decides what the current user may do.
 */

type Client = SupabaseClient<Database>;

export const REVIEWS_PAGE_SIZE = 10;
export const REVIEW_COMMENT_MAX = 500;

// Embeds the author's profile via the reviews.user_id → profiles.id foreign key.
// The FK name is required since Phase 10: review_votes also links reviews and
// profiles, so a plain profiles(...) embed is ambiguous (PostgREST error PGRST201).
const REVIEW_SELECT =
  "id, restroom_id, user_id, rating, comment, images, helpful_count, status, created_at, profiles!reviews_user_id_fkey(username, avatar_url)";

type ReviewRowWithAuthor = Omit<ReviewRow, "flag_count" | "is_demo"> & {
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
    helpfulCount: row.helpful_count,
    status: row.status,
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
export class DuplicateReviewError extends LocalizedError {
  constructor() {
    super("duplicateReview");
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
    throw toAppError(error);
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
  if (error) throw toAppError(error);
  // RLS hides rows you don't own, so "no row" means it's gone or not yours
  if (!data) throw new LocalizedError("reviewNotFound");
  return toReview(data);
}

// ---------- helpful votes ----------

/** Which of these reviews the user already marked helpful. */
export async function fetchVotedReviewIds(
  supabase: Client,
  userId: string,
  reviewIds: string[]
): Promise<Set<string>> {
  if (reviewIds.length === 0) return new Set();
  const { data, error } = await supabase
    .from("review_votes")
    .select("review_id")
    .eq("user_id", userId)
    .in("review_id", reviewIds);
  if (error) throw new Error(error.message);
  return new Set(data.map((row) => row.review_id));
}

/**
 * Marks / un-marks a review as helpful. The database trigger updates the
 * review's helpful_count and gives (or takes back) 1 point to its author.
 * RLS blocks voting on your own review.
 */
export async function setHelpfulVote(
  supabase: Client,
  reviewId: string,
  userId: string,
  helpful: boolean
): Promise<void> {
  if (helpful) {
    const { error } = await supabase.from("review_votes").insert({ review_id: reviewId, user_id: userId });
    // 23505 = already voted (e.g. in another tab): that's the state we want
    if (error && error.code !== "23505") throw toAppError(error);
  } else {
    const { error } = await supabase
      .from("review_votes")
      .delete()
      .eq("review_id", reviewId)
      .eq("user_id", userId);
    if (error) throw toAppError(error);
  }
}

export async function deleteReview(supabase: Client, reviewId: string): Promise<void> {
  const { data, error } = await supabase.from("reviews").delete().eq("id", reviewId).select("id");
  if (error) throw toAppError(error);
  if (data.length === 0) throw new LocalizedError("reviewDeleteFailed");
}
