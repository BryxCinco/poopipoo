"use client";

import { motion } from "framer-motion";
import { ChevronDown, CloudOff, Loader2, MessageSquare, Pencil, RefreshCw, ThumbsUp } from "lucide-react";

import { DeleteReviewButton } from "@/components/restroom/DeleteReviewButton";
import { StarRating } from "@/components/restroom/StarRating";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { SPRING, staggerItemCapped } from "@/lib/animations";
import { formatAbsoluteDate, formatRelativeTime } from "@/lib/relative-time";
import { cn } from "@/lib/utils";
import type { Review } from "@/types/review";

// ---------- helpful vote ----------

export interface HelpfulState {
  /** The viewer already marked this review helpful */
  voted: boolean;
  /** A vote change is saving */
  pending?: boolean;
  /** Omit for the viewer's own review (count only, no button) */
  onToggle?: () => void;
}

function HelpfulButton({ count, state }: { count: number; state: HelpfulState }) {
  if (!state.onToggle) {
    // Own review: just show how many people it helped
    return count > 0 ? (
      <p className="flex items-center gap-1 text-xs text-muted-foreground">
        <ThumbsUp className="h-3.5 w-3.5" aria-hidden="true" />
        {count} ang natulungan
      </p>
    ) : null;
  }

  return (
    <motion.button
      type="button"
      onClick={state.onToggle}
      disabled={state.pending}
      aria-pressed={state.voted}
      aria-label={`${state.voted ? "Alisin ang helpful vote" : "Markahan na nakatulong"} (${count})`}
      whileTap={{ scale: 0.92 }}
      transition={SPRING}
      className={cn(
        "flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60",
        state.voted
          ? "border-primary/40 bg-primary/10 text-primary"
          : "text-muted-foreground hover:border-primary/40 hover:text-foreground"
      )}
    >
      <ThumbsUp className={cn("h-3.5 w-3.5", state.voted && "fill-current")} aria-hidden="true" />
      Nakatulong
      {count > 0 && <span className="tabular-nums">{count}</span>}
    </motion.button>
  );
}

// ---------- single review ----------

interface ReviewItemProps {
  review: Review;
  /** Shows edit/delete controls when set (the viewer's own review). */
  onEdit?: () => void;
  onDelete?: () => void;
  /** Dims the card while an optimistic change is saving. */
  pending?: boolean;
  /** Helpful vote button / count; omit to hide */
  helpful?: HelpfulState;
  className?: string;
}

export function ReviewItem({ review, onEdit, onDelete, pending = false, helpful, className }: ReviewItemProps) {
  return (
    <article
      className={cn("flex gap-3 rounded-xl border bg-card p-3 shadow-sm transition-opacity duration-200", pending && "opacity-60", className)}
      aria-busy={pending}
    >
      <Avatar className="h-9 w-9 shrink-0">
        {review.author.avatarUrl && <AvatarImage src={review.author.avatarUrl} alt="" />}
        <AvatarFallback className="bg-muted text-sm font-semibold uppercase text-muted-foreground">
          {review.author.username.slice(0, 1)}
        </AvatarFallback>
      </Avatar>

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-baseline justify-between gap-2">
          <p className="truncate text-sm font-semibold">{review.author.username}</p>
          {/* Relative time depends on "now", which differs between server and browser */}
          <time
            dateTime={review.createdAt}
            title={formatAbsoluteDate(review.createdAt)}
            className="shrink-0 text-xs text-muted-foreground"
            suppressHydrationWarning
          >
            {pending ? "Sine-save..." : formatRelativeTime(review.createdAt)}
          </time>
        </div>
        <StarRating rating={review.rating} />
        {review.comment && (
          <p className="whitespace-pre-line break-words text-sm leading-relaxed">{review.comment}</p>
        )}

        {helpful && !pending && (
          <div className="mt-1">
            <HelpfulButton count={review.helpfulCount} state={helpful} />
          </div>
        )}

        {(onEdit || onDelete) && (
          <div className="-ml-2 mt-1 flex gap-1">
            {onEdit && (
              <Button type="button" variant="ghost" size="sm" className="h-8 px-2" onClick={onEdit} disabled={pending}>
                <Pencil aria-hidden="true" />
                I-edit
              </Button>
            )}
            {onDelete && <DeleteReviewButton onConfirm={onDelete} disabled={pending} />}
          </div>
        )}
      </div>
    </article>
  );
}

export function ReviewItemSkeleton() {
  return (
    <div className="flex gap-3 rounded-xl border bg-card p-3" aria-hidden="true">
      <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
      <div className="flex flex-1 flex-col gap-2">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-full" />
      </div>
    </div>
  );
}

// ---------- list ----------

interface ReviewListProps {
  reviews: Review[];
  /** Total matching reviews on the server (for "Load more"). */
  total: number;
  /** First load in progress (no reviews yet). */
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  onRetry: () => void;
  onLoadMore: () => void;
  /** Viewer's id: their reviews get edit/delete buttons. */
  currentUserId?: string | null;
  onEdit?: (review: Review) => void;
  onDelete?: (review: Review) => void;
  /** Helpful vote state for each review (omit to hide the button) */
  getHelpful?: (review: Review) => HelpfulState;
  emptyText?: string;
}

export function ReviewList({
  reviews,
  total,
  loading,
  loadingMore,
  error,
  onRetry,
  onLoadMore,
  currentUserId = null,
  onEdit,
  onDelete,
  getHelpful,
  emptyText = "Wala pang review. Ikaw ang mauna!",
}: ReviewListProps) {
  if (loading) {
    return (
      <div className="flex flex-col gap-2" aria-busy="true" aria-label="Naglo-load ang reviews">
        <ReviewItemSkeleton />
        <ReviewItemSkeleton />
      </div>
    );
  }

  if (error && reviews.length === 0) {
    return (
      <div className="rounded-xl border border-dashed">
        <EmptyState
          compact
          icon={<CloudOff />}
          tone="error"
          role="alert"
          title="Hindi ma-load ang mga review"
          action={
            <Button variant="outline" size="sm" onClick={onRetry}>
              <RefreshCw aria-hidden="true" />
              Subukan ulit
            </Button>
          }
        />
      </div>
    );
  }

  if (reviews.length === 0) {
    return (
      <div className="rounded-xl border border-dashed">
        <EmptyState compact icon={<MessageSquare />} title={emptyText} />
      </div>
    );
  }

  const remaining = total - reviews.length;

  return (
    <div className="flex flex-col gap-2">
      <ul className="flex flex-col gap-2">
        {reviews.map((review, index) => {
          const isOwn = currentUserId !== null && review.userId === currentUserId;
          return (
            // Stagger in; "Tingnan pa" pages animate in as they're added
            <motion.li
              key={review.id}
              custom={index % 10}
              variants={staggerItemCapped}
              initial="hidden"
              animate="visible"
            >
              <ReviewItem
                review={review}
                onEdit={isOwn && onEdit ? () => onEdit(review) : undefined}
                onDelete={isOwn && onDelete ? () => onDelete(review) : undefined}
                helpful={getHelpful?.(review)}
              />
            </motion.li>
          );
        })}
      </ul>

      {loadingMore && <ReviewItemSkeleton />}

      {error && reviews.length > 0 && (
        <p className="flex items-center justify-center gap-2 text-sm text-destructive" role="alert">
          Hindi ma-load ang iba pang review.
          <Button variant="ghost" size="sm" className="h-7 px-2" onClick={onRetry}>
            <RefreshCw aria-hidden="true" />
            Subukan ulit
          </Button>
        </p>
      )}

      {remaining > 0 && !loadingMore && !error && (
        <Button variant="outline" onClick={onLoadMore} className="w-full">
          <ChevronDown aria-hidden="true" />
          Tingnan pa ({remaining})
        </Button>
      )}
      {loadingMore && (
        <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground" role="status">
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
          Naglo-load...
        </p>
      )}
    </div>
  );
}
