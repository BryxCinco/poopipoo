"use client";

import { useState, type KeyboardEvent } from "react";
import { motion } from "framer-motion";
import { Send, Star } from "lucide-react";

import { AnimatedButton } from "@/components/ui/AnimatedButton";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SPRING } from "@/lib/animations";
import { REVIEW_COMMENT_MAX } from "@/lib/reviews/queries";
import { cn } from "@/lib/utils";
import type { ReviewInput } from "@/types/review";

const RATING_LABELS = ["", "Napakapangit", "Pangit", "Okay lang", "Maganda", "Napakaganda"] as const;

// ---------- interactive stars ----------

interface StarInputProps {
  value: number;
  onChange: (value: number) => void;
  invalid?: boolean;
  disabled?: boolean;
}

/**
 * 1–5 star picker. Hovering previews a rating; arrow keys change it.
 * Exposed to assistive tech as a radio group.
 */
function StarInput({ value, onChange, invalid = false, disabled = false }: StarInputProps) {
  const [hovered, setHovered] = useState(0);
  const shown = hovered || value;

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return;
    if (event.key === "ArrowRight" || event.key === "ArrowUp") {
      event.preventDefault();
      onChange(Math.min(5, value + 1));
    } else if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
      event.preventDefault();
      onChange(Math.max(1, value - 1));
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <div
        role="radiogroup"
        aria-label="Rating"
        aria-invalid={invalid}
        aria-describedby={invalid ? "rating-error" : undefined}
        onKeyDown={handleKeyDown}
        onMouseLeave={() => setHovered(0)}
        className="flex gap-1"
      >
        {[1, 2, 3, 4, 5].map((star) => {
          const filled = star <= shown;
          return (
            <motion.button
              key={star}
              type="button"
              role="radio"
              aria-checked={value === star}
              aria-label={`${star} star — ${RATING_LABELS[star]}`}
              // Roving focus: only the selected star (or the first) is tabbable
              tabIndex={value === star || (value === 0 && star === 1) ? 0 : -1}
              disabled={disabled}
              onClick={() => onChange(star)}
              onMouseEnter={() => setHovered(star)}
              // Grow on hover, squish on tap
              whileHover={disabled ? undefined : { scale: 1.15 }}
              whileTap={disabled ? undefined : { scale: 0.85 }}
              transition={SPRING}
              className="rounded-md p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
            >
              <Star
                className={cn(
                  "h-8 w-8 transition-[color,fill] duration-150",
                  filled ? "fill-highlight text-highlight" : "text-muted-foreground/30",
                  invalid && !filled && "text-destructive/50"
                )}
                aria-hidden="true"
              />
            </motion.button>
          );
        })}
      </div>
      <p className="h-5 text-sm text-muted-foreground" aria-live="polite">
        {shown > 0 ? RATING_LABELS[shown] : "Pumili ng rating"}
      </p>
    </div>
  );
}

// ---------- form ----------

interface ReviewFormProps {
  /** Controlled values, so the parent can keep them if submitting fails. */
  value: ReviewInput;
  onChange: (value: ReviewInput) => void;
  onSubmit: () => void;
  onCancel?: () => void;
  submitting: boolean;
  /** true when editing an existing review */
  isEdit: boolean;
}

export function ReviewForm({ value, onChange, onSubmit, onCancel, submitting, isEdit }: ReviewFormProps) {
  const [showRatingError, setShowRatingError] = useState(false);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (value.rating < 1) {
      setShowRatingError(true);
      return;
    }
    onSubmit();
  };

  const ratingInvalid = showRatingError && value.rating < 1;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-sm" noValidate>
      <p className="font-semibold">{isEdit ? "I-edit ang review mo" : "Mag-iwan ng review"}</p>

      <StarInput
        value={value.rating}
        onChange={(rating) => onChange({ ...value, rating })}
        invalid={ratingInvalid}
        disabled={submitting}
      />
      {ratingInvalid && (
        <p id="rating-error" role="alert" className="-mt-2 animate-shake text-xs font-medium text-destructive">
          Pumili ng 1 hanggang 5 stars.
        </p>
      )}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="review-comment">
          Comment <span className="font-normal text-muted-foreground">(optional)</span>
        </Label>
        <Textarea
          id="review-comment"
          value={value.comment}
          onChange={(e) => onChange({ ...value, comment: e.target.value })}
          placeholder="Malinis ba? May tubig at tissue? Mahaba ang pila?"
          maxLength={REVIEW_COMMENT_MAX}
          rows={3}
          disabled={submitting}
        />
        <p className="text-right text-xs text-muted-foreground">
          {value.comment.length}/{REVIEW_COMMENT_MAX}
        </p>
      </div>

      <div className="flex gap-2">
        {onCancel && (
          <AnimatedButton type="button" variant="outline" onClick={onCancel} disabled={submitting} className="flex-1">
            Cancel
          </AnimatedButton>
        )}
        <AnimatedButton type="submit" loading={submitting} loadingText="Sine-save..." className="flex-1">
          <Send aria-hidden="true" />
          {isEdit ? "I-update" : "I-post ang review"}
        </AnimatedButton>
      </div>
    </form>
  );
}
