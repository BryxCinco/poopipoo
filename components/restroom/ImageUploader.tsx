"use client";

import { useId, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { ImagePlus, Loader2, X } from "lucide-react";

import { useI18n } from "@/hooks/use-i18n";
import { scaleIn, SPRING } from "@/lib/animations";
import { errorText } from "@/lib/i18n/errors";
import { format } from "@/lib/i18n/format";
import { compressPhoto, MAX_PHOTOS } from "@/lib/restroom-photos";
import { cn } from "@/lib/utils";

/** A picked photo, already compressed, waiting to be uploaded on submit. */
export interface PendingPhoto {
  id: string;
  file: File;
  /** Object URL for the preview; revoked when the photo is removed */
  previewUrl: string;
}

interface ImageUploaderProps {
  photos: PendingPhoto[];
  onChange: (photos: PendingPhoto[]) => void;
  /** Shown instead of the picker (e.g. demo mode, outside Metro Manila) */
  disabledReason?: string | null;
  /** While the form uploads: "Uploading photos (1/3)..." */
  uploadProgress?: { done: number; total: number } | null;
}

/**
 * Photo picker with previews. Photos are compressed right after picking
 * (lib/restroom-photos.ts), so the preview shows what will be uploaded and
 * the form only has to upload small files.
 */
export function ImageUploader({ photos, onChange, disabledReason = null, uploadProgress = null }: ImageUploaderProps) {
  const { t } = useI18n();
  const ta = t.add;
  const inputId = useId();
  // Percent of the photo being compressed right now (null = idle)
  const [compressing, setCompressing] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const remaining = MAX_PHOTOS - photos.length;
  const busy = compressing !== null || uploadProgress !== null;

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setError(null);
    const picked = Array.from(files).slice(0, remaining);
    const added: PendingPhoto[] = [];
    for (const file of picked) {
      setCompressing(0);
      try {
        const compressed = await compressPhoto(file, (percent) => setCompressing(Math.round(percent)));
        added.push({ id: crypto.randomUUID(), file: compressed, previewUrl: URL.createObjectURL(compressed) });
      } catch (caught) {
        setError(errorText(caught, t));
      }
    }
    setCompressing(null);
    if (files.length > remaining) setError(format(ta.photosLimit, { max: MAX_PHOTOS }));
    if (added.length > 0) onChange([...photos, ...added]);
  };

  const remove = (photo: PendingPhoto) => {
    URL.revokeObjectURL(photo.previewUrl);
    onChange(photos.filter((p) => p.id !== photo.id));
  };

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 flex w-full items-center justify-between text-sm font-medium">
        <span>
          {ta.photos} <span className="font-normal text-muted-foreground">{ta.optional}</span>
        </span>
        {!disabledReason && (
          <span className="text-xs font-normal text-muted-foreground">
            {format(ta.photoCount, { count: photos.length, max: MAX_PHOTOS })}
          </span>
        )}
      </legend>

      {disabledReason ? (
        <p className="rounded-lg border border-dashed bg-muted/40 px-3 py-3 text-sm text-muted-foreground">
          {disabledReason}
        </p>
      ) : (
        <>
          <p className="text-xs text-muted-foreground">{ta.photosHint}</p>
          <ul className="grid grid-cols-3 gap-2">
            <AnimatePresence initial={false}>
              {photos.map((photo, index) => (
                <motion.li
                  key={photo.id}
                  layout
                  variants={scaleIn}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  transition={SPRING}
                  className="relative aspect-square overflow-hidden rounded-lg border bg-muted"
                >
                  {/* Local preview (object URL): nothing to optimize */}
                  <Image
                    src={photo.previewUrl}
                    alt={format(ta.photoAlt, { n: index + 1 })}
                    fill
                    sizes="(min-width: 768px) 240px, 33vw"
                    className="object-cover"
                    unoptimized
                  />
                  <button
                    type="button"
                    onClick={() => remove(photo)}
                    disabled={busy}
                    aria-label={format(ta.removePhoto, { n: index + 1 })}
                    className="absolute right-1 top-1 flex h-7 w-7 items-center justify-center rounded-full bg-background/90 text-foreground shadow-sm transition-colors hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>
                </motion.li>
              ))}
            </AnimatePresence>

            {remaining > 0 && (
              <li className="relative aspect-square">
                {/* Real file input, visually hidden; the styled label is the button */}
                <input
                  id={inputId}
                  type="file"
                  accept="image/*"
                  multiple
                  disabled={busy}
                  onChange={(event) => {
                    void handleFiles(event.target.files);
                    // Same file can be picked again after removing it
                    event.target.value = "";
                  }}
                  className="peer sr-only"
                />
                <label
                  htmlFor={inputId}
                  className={cn(
                    "flex h-full w-full cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed bg-card text-center text-xs text-muted-foreground transition-colors duration-150",
                    "hover:border-primary/40 hover:bg-muted hover:text-foreground",
                    "peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2",
                    busy && "pointer-events-none opacity-60"
                  )}
                >
                  {compressing !== null ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden="true" />
                      <span>{format(ta.compressing, { percent: compressing })}</span>
                    </>
                  ) : (
                    <>
                      <ImagePlus className="h-5 w-5 text-primary" aria-hidden="true" />
                      <span className="font-medium">{ta.addPhoto}</span>
                    </>
                  )}
                </label>
              </li>
            )}
          </ul>
        </>
      )}

      <p className="sr-only" aria-live="polite">
        {uploadProgress ? format(ta.uploadingPhotos, uploadProgress) : ""}
      </p>
      {error && (
        <p className="animate-shake text-xs font-medium text-destructive" role="alert">
          {error}
        </p>
      )}
    </fieldset>
  );
}
