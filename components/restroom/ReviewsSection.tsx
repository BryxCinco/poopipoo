"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { LogIn } from "lucide-react";

import { ReviewForm } from "@/components/restroom/ReviewForm";
import { ReviewItem, ReviewList } from "@/components/restroom/ReviewList";
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
  updateReview,
} from "@/lib/reviews/queries";
import { createClient } from "@/lib/supabase/client";
import type { Review, ReviewAuthor, ReviewInput } from "@/types/review";

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
const errorMessage = (error: unknown) => (error instanceof Error ? error.message : "Subukan ulit mamaya.");

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
    initialReviews === null ? "Hindi ma-load ang mga review" : null
  );

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
        title: previous ? "Na-update ang review mo!" : "Salamat sa review!",
        description: "Nakakatulong ito sa ibang naghahanap ng CR.",
      });
      syncRating();
    } catch (error) {
      if (error instanceof DuplicateReviewError) {
        // Reviewed already (e.g. in another tab): load it and switch to editing it,
        // keeping what the user just typed.
        const existing = await fetchUserReview(supabase, restroomId, viewer.id).catch(() => null);
        setMyReview(existing);
        setEditing(existing !== null);
        toast({ title: "May review ka na rito", description: "I-update mo na lang ang dati mong review." });
      } else {
        // Roll back and reopen the form with the same values
        setMyReview(previous);
        setEditing(true);
        toast({ variant: "destructive", title: "Hindi ma-save ang review", description: errorMessage(error) });
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
      toast({ title: "Nabura ang review mo." });
      syncRating();
    } catch (error) {
      setMyReview(previous);
      toast({ variant: "destructive", title: "Hindi mabura ang review", description: errorMessage(error) });
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
    } catch (error) {
      setListError(errorMessage(error));
      toast({ variant: "destructive", title: "Hindi ma-load ang mga review", description: "I-check ang internet mo." });
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
        Mga review <span className="font-normal text-muted-foreground">({total})</span>
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
                <p className="text-sm text-muted-foreground">Ginamit mo na ba ang CR na ito? Ibahagi ang karanasan mo.</p>
                <Button asChild className="w-full">
                  <Link href={loginUrl(`/restroom/${restroomId}#reviews`)}>
                    <LogIn aria-hidden="true" />
                    Mag-login para mag-review
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
                <p className="text-sm font-medium text-muted-foreground">Iyong review</p>
                <ReviewItem
                  review={myReview}
                  pending={myPending}
                  onEdit={handleEdit}
                  onDelete={() => void handleDelete()}
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
        emptyText={
          myReview ? "Wala pang ibang nag-review." : "Wala pang review. Ikaw ang mauna!"
        }
      />
    </section>
  );
}
