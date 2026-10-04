import { StarRating } from "@/components/restroom/StarRating";
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

  if (reviewCount === 0) {
    return (
      <p className={cn(text, "italic text-muted-foreground", className)}>Wala pang review</p>
    );
  }

  return (
    <div className={cn("flex items-center gap-1.5", text, className)}>
      <StarRating rating={rating} />
      <span className="font-medium text-foreground">{rating.toFixed(1)}</span>
      <span className="text-muted-foreground">
        ({reviewCount}
        {size === "md" && " reviews"})
      </span>
    </div>
  );
}
