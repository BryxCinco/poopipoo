import imageCompression from "browser-image-compression";
import type { SupabaseClient } from "@supabase/supabase-js";

import { CITIES } from "@/lib/cities";
import { LocalizedError } from "@/lib/i18n/errors";
import type { Database } from "@/types/database";

/**
 * Restroom photos (Phase 16, see 0010_photo_uploads.sql).
 *
 * Flow: the photo is compressed in the browser when it's picked (preview),
 * uploaded to the public bucket `restroom-images/<user id>/<uuid>.webp` when
 * the form is submitted, and the public URLs go into restrooms.images.
 * The database checks the URLs, the count and the area again.
 */

type Client = SupabaseClient<Database>;

const BUCKET = "restroom-images";
/** Per restroom when adding (the database allows up to 5). */
export const MAX_PHOTOS = 3;
/** Bucket limit (0010); compressed photos are far smaller. */
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
/** Don't even try to decode huge files (e.g. a RAW photo) in the browser. */
const MAX_INPUT_BYTES = 30 * 1024 * 1024;

const COMPRESSION = {
  maxSizeMB: 0.5,
  maxWidthOrHeight: 1600,
  fileType: "image/webp",
  initialQuality: 0.8,
  // The web worker would download the library again from a CDN; the main
  // thread is fine for a few photos.
  useWebWorker: false,
} as const;

// Photos are only allowed in Metro Manila for now (same box as the database check)
const PHOTO_AREA = CITIES.find((city) => city.slug === "metro-manila")?.bounds;

export function isInPhotoArea(latitude: number, longitude: number): boolean {
  if (!PHOTO_AREA) return false;
  return (
    latitude >= PHOTO_AREA.south &&
    latitude <= PHOTO_AREA.north &&
    longitude >= PHOTO_AREA.west &&
    longitude <= PHOTO_AREA.east
  );
}

/**
 * True for photos uploaded through this app. Only these are shown (and only
 * their host is allowed for next/image in next.config.mjs), so an old row with
 * some other URL can't break a page or hotlink random content.
 */
export function isRestroomPhotoUrl(url: string): boolean {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return Boolean(base) && url.startsWith(`${base}/storage/v1/object/public/${BUCKET}/`);
}

/** Shrinks a picked photo to WebP, max 1600 px, ~0.5 MB. `onProgress` gets 0–100. */
export async function compressPhoto(file: File, onProgress?: (percent: number) => void): Promise<File> {
  if (!file.type.startsWith("image/")) throw new LocalizedError("photoNotImage");
  if (file.size > MAX_INPUT_BYTES) throw new LocalizedError("photoTooBig");
  let compressed: File;
  try {
    compressed = await imageCompression(file, { ...COMPRESSION, onProgress });
  } catch {
    // e.g. HEIC on a browser that can't decode it
    throw new LocalizedError("photoUnreadable");
  }
  if (compressed.size > MAX_UPLOAD_BYTES) throw new LocalizedError("photoTooBig");
  return compressed;
}

export interface UploadedPhotos {
  urls: string[];
  /** Storage paths, to clean up if saving the restroom fails */
  paths: string[];
}

/**
 * Uploads compressed photos one by one (`onProgress(done, total)` after each).
 * On any failure the ones already uploaded are removed, then it throws.
 */
export async function uploadRestroomPhotos(
  supabase: Client,
  userId: string,
  files: File[],
  onProgress?: (done: number, total: number) => void
): Promise<UploadedPhotos> {
  const uploaded: UploadedPhotos = { urls: [], paths: [] };
  for (const file of files) {
    const extension = file.type === "image/webp" ? "webp" : file.type === "image/png" ? "png" : "jpg";
    const path = `${userId}/${crypto.randomUUID()}.${extension}`;
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, { contentType: file.type, cacheControl: "31536000", upsert: false });
    if (error) {
      await removeRestroomPhotos(supabase, uploaded.paths);
      // Storage policy refused (demo account, banned, signed out) or a network error
      throw new LocalizedError("photoUploadFailed");
    }
    uploaded.paths.push(path);
    uploaded.urls.push(supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl);
    onProgress?.(uploaded.paths.length, files.length);
  }
  return uploaded;
}

/** Best effort: leftovers are harmless (nothing links to them). */
export async function removeRestroomPhotos(supabase: Client, paths: string[]): Promise<void> {
  if (paths.length === 0) return;
  await supabase.storage
    .from(BUCKET)
    .remove(paths)
    .catch(() => undefined);
}
