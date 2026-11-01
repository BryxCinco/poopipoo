"use client";

import Image from "next/image";

import { useI18n } from "@/hooks/use-i18n";
import { format } from "@/lib/i18n/format";
import { isRestroomPhotoUrl } from "@/lib/restroom-photos";
import { cn } from "@/lib/utils";

/**
 * Swipeable row of restroom photos (CSS scroll snap, no carousel library).
 * Only photos uploaded through the app are shown (see isRestroomPhotoUrl).
 */
export function RestroomPhotos({ name, images, className }: { name: string; images: string[]; className?: string }) {
  const { t } = useI18n();
  const photos = images.filter(isRestroomPhotoUrl);
  if (photos.length === 0) return null;

  return (
    <section aria-label={format(t.restroom.photosLabel, { name })} className={className}>
      <ul
        className={cn(
          "flex snap-x snap-mandatory gap-2 overflow-x-auto overscroll-x-contain pb-1",
          // A single photo uses the full width; several peek so it's clear you can swipe
          photos.length === 1 && "justify-center"
        )}
      >
        {photos.map((url, index) => (
          <li
            key={url}
            className={cn(
              "relative aspect-[4/3] shrink-0 snap-center overflow-hidden rounded-xl border bg-muted shadow-sm",
              photos.length === 1 ? "w-full" : "w-[85%] sm:w-[60%]"
            )}
          >
            <Image
              src={url}
              alt={format(t.restroom.photoAlt, { n: index + 1, total: photos.length, name })}
              fill
              sizes="(min-width: 768px) 460px, 85vw"
              className="object-cover"
              // The first photo is near the top of the page
              priority={index === 0}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
