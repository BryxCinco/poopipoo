"use client";

import { StarRating } from "@/components/restroom/StarRating";
import { useI18n } from "@/hooks/use-i18n";
import { plural } from "@/lib/i18n/format";
import { cn } from "@/lib/utils";

interface RestroomRatingProps {
  rating: number;
  reviewCount: number;
  /** "sm" for list items/popups, "md" for the sheet and detail page. */
  size?: "sm" | "md";
  className?: string;
}

/** Stars + number + review count, or "Wala pang review" for new restrooms. */
export function RestroomRating({ rating, reviewCount, size = "md", className }: RestroomRatingProps) {
  const text = size === "sm" ? "text-xs" : "text-sm";
  const { t } = useI18n();

  if (reviewCount === 0) {
    return (
      <p className={cn(text, "italic text-muted-foreground", className)}>{t.restroom.noReviews}</p>
    );
  }

  return (
    <div className={cn("flex items-center gap-1.5", text, className)}>
      <StarRating rating={rating} />
      <span className="font-medium text-foreground">{rating.toFixed(1)}</span>
      <span className="text-muted-foreground">
        ({size === "md" ? plural(t.restroom.reviewCount, reviewCount) : reviewCount})
      </span>
    </div>
  );
}
