"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, MessageSquarePlus } from "lucide-react";

import { ImageUploader, type PendingPhoto } from "@/components/restroom/ImageUploader";
import { AnimatedButton } from "@/components/ui/AnimatedButton";
import { Button } from "@/components/ui/button";
import { useAuthUser } from "@/hooks/use-auth-user";
import { useI18n } from "@/hooks/use-i18n";
import { useToast } from "@/hooks/use-toast";
import { isDemoUser } from "@/lib/auth/demo";
import { errorText } from "@/lib/i18n/errors";
import { format } from "@/lib/i18n/format";
import {
  isInPhotoArea,
  isRestroomPhotoUrl,
  removeRestroomPhotos,
  saveRestroomPhotos,
  uploadRestroomPhotos,
  type UploadedPhotos,
} from "@/lib/restroom-photos";
import { createClient } from "@/lib/supabase/client";
import type { Restroom } from "@/types/restroom";

interface RestroomPhotoPromptProps {
  restroom: Pick<Restroom, "id" | "latitude" | "longitude" | "images">;
  /** Decided on the server: only the author can add photos to a restroom (RLS) */
  isOwner: boolean;
}

/**
 * Empty state on a restroom page without photos (RestroomPhotos shows the
 * gallery otherwise). What it offers depends on who's looking:
 * - the author (in Metro Manila): add photos right here
 * - everyone else: write a review instead (only the author can add photos)
 * - outside Metro Manila: photos aren't available there yet
 */
export function RestroomPhotoPrompt({ restroom, isOwner }: RestroomPhotoPromptProps) {
  const router = useRouter();
  const { t } = useI18n();
  const tr = t.restroom;
  const { toast } = useToast();
  const { user } = useAuthUser();
  const [adding, setAdding] = useState(false);
  const [photos, setPhotos] = useState<PendingPhoto[]>([]);
  const [uploadProgress, setUploadProgress] = useState<{ done: number; total: number } | null>(null);
  const [saving, setSaving] = useState(false);

  // Previews are object URLs: free them when leaving the page
  const photosRef = useRef(photos);
  photosRef.current = photos;
  useEffect(() => () => photosRef.current.forEach((photo) => URL.revokeObjectURL(photo.previewUrl)), []);

  if (restroom.images.some(isRestroomPhotoUrl)) return null;

  const inArea = isInPhotoArea(restroom.latitude, restroom.longitude);
  const canAdd = isOwner && inArea && !isDemoUser(user);
  const description = !inArea ? tr.noPhotosOutsideArea : canAdd ? tr.noPhotosOwner : tr.noPhotosOthers;

  const save = async () => {
    if (!user || photos.length === 0) return;
    setSaving(true);
    const supabase = createClient();
    let uploaded: UploadedPhotos | null = null;
    try {
      setUploadProgress({ done: 0, total: photos.length });
      uploaded = await uploadRestroomPhotos(
        supabase,
        user.id,
        photos.map((photo) => photo.file),
        (done, total) => setUploadProgress({ done, total })
      );
      await saveRestroomPhotos(supabase, restroom.id, uploaded.urls);
      toast({ title: tr.photosSaved });
      // The server page re-renders with the new photos (the gallery replaces this card)
      router.refresh();
    } catch (error) {
      if (uploaded) void removeRestroomPhotos(supabase, uploaded.paths);
      toast({ variant: "destructive", title: tr.photosSaveFailed, description: errorText(error, t) });
      setSaving(false);
    } finally {
      setUploadProgress(null);
    }
  };

  return (
    <section
      aria-labelledby="no-photos-heading"
      className="flex flex-col items-center gap-3 rounded-xl border border-dashed bg-card p-5 text-center shadow-sm"
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Camera className="h-6 w-6" aria-hidden="true" />
      </span>
      <div className="flex flex-col gap-1">
        <h2 id="no-photos-heading" className="font-semibold">
          {tr.noPhotosTitle}
        </h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>

      {canAdd && !adding && (
        <Button type="button" onClick={() => setAdding(true)}>
          <Camera aria-hidden="true" />
          {tr.addPhotos}
        </Button>
      )}

      {canAdd && adding && (
        <div className="flex w-full flex-col gap-3 text-left">
          <ImageUploader photos={photos} onChange={setPhotos} uploadProgress={uploadProgress} />
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              disabled={saving}
              onClick={() => {
                photos.forEach((photo) => URL.revokeObjectURL(photo.previewUrl));
                setPhotos([]);
                setAdding(false);
              }}
            >
              {t.common.cancel}
            </Button>
            <AnimatedButton
              type="button"
              className="flex-1"
              disabled={photos.length === 0}
              loading={saving}
              loadingText={uploadProgress ? format(t.add.uploadingPhotos, uploadProgress) : t.common.loading}
              onClick={() => void save()}
            >
              {tr.savePhotos}
            </AnimatedButton>
          </div>
        </div>
      )}

      {!isOwner && inArea && (
        <Button asChild variant="outline">
          <a href="#reviews">
            <MessageSquarePlus aria-hidden="true" />
            {tr.writeReview}
          </a>
        </Button>
      )}
    </section>
  );
}
