import { Star } from "lucide-react";

import { cn } from "@/lib/utils";

interface StarRatingProps {
  rating: number;
  className?: string;
}

/**
 * 5 stars with partial fill (e.g. 4.3 → 4 full stars + 30% of the 5th).
 * Each star is a gray outline with a clipped yellow star on top.
 */
export function StarRating({ rating, className }: StarRatingProps) {
  return (
    <div
      className={cn("flex items-center gap-0.5", className)}
      role="img"
      aria-label={`${rating.toFixed(1)} out of 5 stars`}
    >
      {Array.from({ length: 5 }, (_, i) => {
        const fill = Math.min(Math.max(rating - i, 0), 1);
        return (
          <span key={i} className="relative inline-block h-4 w-4">
            <Star className="absolute inset-0 h-4 w-4 text-zinc-300" aria-hidden="true" />
            <span
              className="absolute inset-0 overflow-hidden"
              style={{ width: `${fill * 100}%` }}
            >
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" aria-hidden="true" />
            </span>
          </span>
        );
      })}
    </div>
  );
}
