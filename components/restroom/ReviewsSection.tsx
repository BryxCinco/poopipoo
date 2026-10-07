"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { LogIn } from "lucide-react";

import { ReviewForm } from "@/components/restroom/ReviewForm";
import { ReviewItem, ReviewList, type HelpfulState } from "@/components/restroom/ReviewList";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";
import { DURATION, EASE_OUT } from "@/lib/animations";
import { loginUrl } from "@/lib/auth/return-url";
import { invalidateRestrooms } from "@/lib/restroom-store";
import {
  createReview,
  deleteReview,
  DuplicateReviewError,
  fetchReviewsPage,
  fetchUserReview,
  fetchVotedReviewIds,
  setHelpfulVote,
  updateReview,
} from "@/lib/reviews/queries";
import { createClient } from "@/lib/supabase/client";
import type { Review, ReviewAuthor, ReviewInput } from "@/types/review";
import { useI18n } from "@/hooks/use-i18n";
import { errorText } from "@/lib/i18n/errors";

export interface ReviewViewer extends ReviewAuthor {
  id: string;
}

interface ReviewsSectionProps {
  restroomId: string;
  /** Signed-in user, or null for guests. */
  viewer: ReviewViewer | null;
  initialMyReview: Review | null;
  /** First page of other people's reviews; null if loading them failed on the server. */
  initialReviews: Review[] | null;
  /** Total of other people's reviews. */
  initialTotal: number;
  /** Open the edit form right away (linked from the profile page). */
  startEditing?: boolean;
}

const EMPTY_DRAFT: ReviewInput = { rating: 0, comment: "" };

export function ReviewsSection({
  restroomId,
  viewer,
  initialMyReview,
  initialReviews,
  initialTotal,
  startEditing = false,
}: ReviewsSectionProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useI18n();
  const errorMessage = (error: unknown) => errorText(error, t);

  // ---- the viewer's own review ----
  const [myReview, setMyReview] = useState<Review | null>(initialMyReview);
  const [myPending, setMyPending] = useState(false);
  const [editing, setEditing] = useState(startEditing && initialMyReview !== null);
  const [draft, setDraft] = useState<ReviewInput>(
    initialMyReview ? { rating: initialMyReview.rating, comment: initialMyReview.comment } : EMPTY_DRAFT
  );
  const [submitting, setSubmitting] = useState(false);

  // ---- everyone else's reviews ----
  const [others, setOthers] = useState<Review[]>(initialReviews ?? []);
  const [othersTotal, setOthersTotal] = useState(initialTotal);
  const [page, setPage] = useState(0);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(
    initialReviews === null ? t.reviews.loadError : null
  );

  // ---- helpful votes (on other people's reviews) ----
  const [votedIds, setVotedIds] = useState<ReadonlySet<string>>(new Set());
  const [votePending, setVotePending] = useState<ReadonlySet<string>>(new Set());
  const viewerId = viewer?.id ?? null;

  /** Loads which of these reviews the viewer already voted on (merged into votedIds). */
  const loadVotes = useCallback(
    async (reviewIds: string[]) => {
      if (!viewerId || reviewIds.length === 0) return;
      try {
        const voted = await fetchVotedReviewIds(createClient(), viewerId, reviewIds);
        setVotedIds((prev) => new Set([...Array.from(prev), ...Array.from(voted)]));
      } catch {
        // Not critical: buttons just start as "not voted"
      }
    },
    [viewerId]
  );

  // Votes for the first page (rendered on the server)
  useEffect(() => {
    void loadVotes((initialReviews ?? []).map((review) => review.id));
  }, [loadVotes, initialReviews]);

  const setReviewPending = (id: string, pending: boolean) =>
    setVotePending((prev) => {
      const next = new Set(prev);
      if (pending) next.add(id);
      else next.delete(id);
      return next;
    });

  /** Optimistic toggle: update the count and button now, roll back if saving fails. */
  const toggleHelpful = async (review: Review) => {
    if (!viewer) {
      toast({ title: t.reviews.loginToVote, description: t.reviews.loginToVoteDescription });
      return;
    }
    const helpful = !votedIds.has(review.id);
    const apply = (on: boolean) => {
      setVotedIds((prev) => {
        const next = new Set(prev);
        if (on) next.add(review.id);
        else next.delete(review.id);
        return next;
      });
      setOthers((prev) =>
        prev.map((item) =>
          item.id === review.id ? { ...item, helpfulCount: Math.max(item.helpfulCount + (on ? 1 : -1), 0) } : item
        )
      );
    };

    apply(helpful);
    setReviewPending(review.id, true);
    try {
      await setHelpfulVote(createClient(), review.id, viewer.id, helpful);
    } catch (error) {
      apply(!helpful);
      toast({ variant: "destructive", title: t.reviews.voteFailed, description: errorMessage(error) });
    } finally {
      setReviewPending(review.id, false);
    }
  };

  const getHelpful = (review: Review): HelpfulState => ({
    voted: votedIds.has(review.id),
    pending: votePending.has(review.id),
    onToggle: () => void toggleHelpful(review),
  });

  // Came from "I-edit" on the profile page: bring the form into view
  useEffect(() => {
    if (startEditing) document.getElementById("iyong-review")?.scrollIntoView({ block: "center" });
  }, [startEditing]);

  /** After any change: refresh the server-rendered rating and mark the map/list cache stale. */
  const syncRating = () => {
    invalidateRestrooms();
    router.refresh();
  };

  // ---------- own review: create / update (optimistic) ----------

  const handleSubmit = async () => {
    if (!viewer || submitting) return;
    const previous = myReview;
    const input: ReviewInput = { rating: draft.rating, comment: draft.comment.trim() };

    // Show the review immediately; replaced by the server's copy (or rolled back) below
    setMyReview({
      id: previous?.id ?? "optimistic",
      restroomId,
      userId: viewer.id,
      rating: input.rating,
      comment: input.comment,
      images: previous?.images ?? [],
      createdAt: previous?.createdAt ?? new Date().toISOString(),
      author: { username: viewer.username, avatarUrl: viewer.avatarUrl },
      helpfulCount: previous?.helpfulCount ?? 0,
      status: previous?.status ?? "approved",
    });
    setMyPending(true);
    setEditing(false);
    setSubmitting(true);

    const supabase = createClient();
    try {
      const saved = previous
        ? await updateReview(supabase, previous.id, input)
        : await createReview(supabase, restroomId, viewer.id, input);
      setMyReview(saved);
      setDraft({ rating: saved.rating, comment: saved.comment });
      toast({
        title: previous ? t.reviews.updated : t.reviews.thanks,
        description: t.reviews.savedDescription,
      });
      syncRating();
    } catch (error) {
      if (error instanceof DuplicateReviewError) {
        // Reviewed already (e.g. in another tab): load it and switch to editing it,
        // keeping what the user just typed.
        const existing = await fetchUserReview(supabase, restroomId, viewer.id).catch(() => null);
        setMyReview(existing);
        setEditing(existing !== null);
        toast({ title: t.reviews.alreadyReviewed, description: t.reviews.alreadyReviewedDescription });
      } else {
        // Roll back and reopen the form with the same values
        setMyReview(previous);
        setEditing(true);
        toast({ variant: "destructive", title: t.reviews.saveFailed, description: errorMessage(error) });
      }
    } finally {
      setMyPending(false);
      setSubmitting(false);
    }
  };

  const handleEdit = () => {
    if (!myReview) return;
    setDraft({ rating: myReview.rating, comment: myReview.comment });
    setEditing(true);
  };

  // ---------- own review: delete (optimistic) ----------

  const handleDelete = async () => {
    const previous = myReview;
    if (!previous) return;
    setMyReview(null);
    setDraft(EMPTY_DRAFT);
    setEditing(false);
    try {
      await deleteReview(createClient(), previous.id);
      toast({ title: t.reviews.deleted });
      syncRating();
    } catch (error) {
      setMyReview(previous);
      toast({ variant: "destructive", title: t.reviews.deleteFailed, description: errorMessage(error) });
    }
  };

  // ---------- other reviews: pagination + retry ----------

  const loadPage = async (nextPage: number) => {
    setListLoading(true);
    setListError(null);
    try {
      const result = await fetchReviewsPage(createClient(), restroomId, nextPage, viewer?.id ?? null);
      setOthers((prev) => {
        const base = nextPage === 0 ? [] : prev;
        const seen = new Set(base.map((r) => r.id));
        return [...base, ...result.reviews.filter((r) => !seen.has(r.id))];
      });
      setOthersTotal(result.total);
      setPage(nextPage);
      void loadVotes(result.reviews.map((review) => review.id));
    } catch (error) {
      setListError(errorMessage(error));
      toast({ variant: "destructive", title: t.reviews.loadError, description: t.reviews.loadErrorDescription });
    } finally {
      setListLoading(false);
    }
  };

  const total = othersTotal + (myReview ? 1 : 0);
  const showForm = viewer !== null && (myReview === null || editing);

  // A typed-but-unsaved review counts as unsaved changes (confirm before leaving)
  const draftChanged =
    draft.rating !== (myReview?.rating ?? 0) || draft.comment.trim() !== (myReview?.comment ?? "").trim();
  useUnsavedChanges("review", showForm && draftChanged && !submitting);

  // Which block shows in "#iyong-review"; changing it animates the height
  const mode = !viewer ? "login" : showForm ? "form" : myReview ? "mine" : "none";

  return (
    <section id="reviews" aria-labelledby="reviews-heading" className="flex scroll-mt-4 flex-col gap-3">
      <h2 id="reviews-heading" className="font-semibold">
        {t.reviews.heading} <span className="font-normal text-muted-foreground">({total})</span>
      </h2>

      <div id="iyong-review" className="scroll-mt-4">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={mode}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: DURATION.slow, ease: EASE_OUT }}
            // Clip during the height animation, with a margin so focus rings aren't cut off
            style={{ overflow: "clip", overflowClipMargin: 4 }}
          >
            {!viewer ? (
              <div className="flex flex-col items-center gap-2 rounded-lg border p-4 text-center">
                <p className="text-sm text-muted-foreground">{t.reviews.loginPrompt}</p>
                <Button asChild className="w-full">
                  <Link href={loginUrl(`/restroom/${restroomId}#reviews`)}>
                    <LogIn aria-hidden="true" />
                    {t.reviews.loginToReview}
                  </Link>
                </Button>
              </div>
            ) : showForm ? (
              <ReviewForm
                value={draft}
                onChange={setDraft}
                onSubmit={() => void handleSubmit()}
                onCancel={myReview ? () => setEditing(false) : undefined}
                submitting={submitting}
                isEdit={myReview !== null}
              />
            ) : myReview ? (
              <div className="flex flex-col gap-1.5">
                <p className="text-sm font-medium text-muted-foreground">{t.reviews.yourReview}</p>
                <ReviewItem
                  review={myReview}
                  pending={myPending}
                  onEdit={handleEdit}
                  onDelete={() => void handleDelete()}
                  helpful={{ voted: false }}
                  className="border-primary/30 bg-primary/5"
                />
              </div>
            ) : null}
          </motion.div>
        </AnimatePresence>
      </div>

      <ReviewList
        reviews={others}
        total={othersTotal}
        loading={listLoading && others.length === 0}
        loadingMore={listLoading && others.length > 0}
        error={listError}
        onRetry={() => void loadPage(others.length === 0 ? 0 : page + 1)}
        onLoadMore={() => void loadPage(page + 1)}
        getHelpful={getHelpful}
        reportViewerId={viewer?.id ?? null}
        emptyText={
          myReview ? t.reviews.emptyOthers : t.reviews.emptyFirst
        }
      />
    </section>
  );
}
