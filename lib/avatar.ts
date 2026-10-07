import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

/**
 * Avatar upload to Supabase Storage (bucket "avatars", see 0004_gamification.sql).
 * Files live in avatars/<user id>/..., which the storage policies require.
 */

type Client = SupabaseClient<Database>;

const BUCKET = "avatars";
export const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
export const AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
const OUTPUT_SIZE = 256;

/**
 * Center-crops and shrinks the photo to 256x256 WebP in the browser, so a
 * 5 MB phone photo uploads as ~20 KB. Returns the original file if the
 * browser can't do it.
 */
async function shrinkImage(file: File): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file);
    const side = Math.min(bitmap.width, bitmap.height);
    const canvas = document.createElement("canvas");
    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;
    const context = canvas.getContext("2d");
    if (!context) return file;
    context.drawImage(
      bitmap,
      (bitmap.width - side) / 2,
      (bitmap.height - side) / 2,
      side,
      side,
      0,
      0,
      OUTPUT_SIZE,
      OUTPUT_SIZE
    );
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.85));
    // Some browsers can't encode WebP and silently return PNG; either is allowed
    return blob ?? file;
  } catch {
    return file;
  }
}

/** Removes every file in the user's folder except `keep`. Failures are ignored (just leftovers). */
async function removeOldAvatars(supabase: Client, userId: string, keep: string | null): Promise<void> {
  const { data } = await supabase.storage.from(BUCKET).list(userId);
  const paths = (data ?? []).map((file) => `${userId}/${file.name}`).filter((path) => path !== keep);
  if (paths.length > 0) await supabase.storage.from(BUCKET).remove(paths);
}

/** Uploads a new avatar, saves its URL on the profile, and returns the URL. */
export async function uploadAvatar(supabase: Client, userId: string, file: File): Promise<string> {
  if (!(AVATAR_TYPES as readonly string[]).includes(file.type)) {
    throw new Error("JPG, PNG o WebP lang ang pwede.");
  }
  const image = await shrinkImage(file);
  if (image.size > AVATAR_MAX_BYTES) throw new Error("Masyadong malaki ang photo (max 2 MB).");

  const extension = image.type === "image/webp" ? "webp" : image.type === "image/png" ? "png" : "jpg";
  // New name each time, so browsers and the CDN don't show the old cached photo
  const path = `${userId}/avatar-${Date.now()}.${extension}`;
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, image, { contentType: image.type || file.type, upsert: false });
  if (uploadError) throw new Error(uploadError.message);

  const url = supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  const { error } = await supabase.from("profiles").update({ avatar_url: url }).eq("id", userId);
  if (error) {
    await supabase.storage.from(BUCKET).remove([path]);
    throw new Error(error.message);
  }

  await removeOldAvatars(supabase, userId, path).catch(() => undefined);
  return url;
}

/** Clears the profile photo (back to the letter avatar). */
export async function removeAvatar(supabase: Client, userId: string): Promise<void> {
  const { error } = await supabase.from("profiles").update({ avatar_url: null }).eq("id", userId);
  if (error) throw new Error(error.message);
  await removeOldAvatars(supabase, userId, null).catch(() => undefined);
}
