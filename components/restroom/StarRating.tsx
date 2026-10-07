"use client";

import { motion } from "framer-motion";
import { Star } from "lucide-react";

import { useI18n } from "@/hooks/use-i18n";
import { DURATION, EASE_OUT } from "@/lib/animations";
import { format } from "@/lib/i18n/format";
import { cn } from "@/lib/utils";

interface StarRatingProps {
  rating: number;
  className?: string;
}

/**
 * 5 stars with partial fill (e.g. 4.3 → 4 full stars + 30% of the 5th).
 * Each star is a gray outline with a clipped amber star on top; the amber
 * part fills in left to right, one star after another, when it appears.
 */
export function StarRating({ rating, className }: StarRatingProps) {
  const { t } = useI18n();
  return (
    <div
      className={cn("flex items-center gap-0.5", className)}
      role="img"
      aria-label={format(t.restroom.starsLabel, { rating: rating.toFixed(1) })}
    >
      {Array.from({ length: 5 }, (_, i) => {
        const fill = Math.min(Math.max(rating - i, 0), 1);
        return (
          <span key={i} className="relative inline-block h-4 w-4">
            <Star className="absolute inset-0 h-4 w-4 text-muted-foreground/30" aria-hidden="true" />
            <motion.span
              className="absolute inset-0 overflow-hidden"
              initial={{ width: "0%" }}
              animate={{ width: `${fill * 100}%` }}
              transition={{ duration: DURATION.slow, ease: EASE_OUT, delay: i * 0.05 }}
            >
              <Star className="h-4 w-4 fill-highlight text-highlight" aria-hidden="true" />
            </motion.span>
          </span>
        );
      })}
    </div>
  );
}
