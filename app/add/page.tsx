import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AddRestroomForm } from "@/components/add/AddRestroomForm";
import { BannedNotice, RateLimitNotice } from "@/components/moderation/Notices";
import { LocalRestroomsUpload } from "@/components/restroom/LocalRestroomsUpload";
import { loginUrl } from "@/lib/auth/return-url";
import { getCurrentUser } from "@/lib/auth/server";
import { getT } from "@/lib/i18n/server";
import { pageMetadata } from "@/lib/metadata";
import { getViewerModeration } from "@/lib/moderation/server";
import { createClient } from "@/lib/supabase/server";

export function generateMetadata(): Metadata {
  const { title, description } = getT().meta.add;
  return pageMetadata({ title, description, path: "/add" });
}

export default async function AddPage() {
  const user = await getCurrentUser();
  // Adding requires an account (RLS also enforces this on insert)
  if (!user) redirect(loginUrl("/add"));

  // Phase 11: banned users and users over the rate limit see why instead of
  // a form they can't submit. (The database enforces both on insert anyway.)
  const [viewer, { data: retryAt }] = await Promise.all([
    getViewerModeration(),
    createClient().rpc("my_rate_limit_retry_at"),
  ]);
  if (viewer?.isBanned) {
    return (
      <div className="flex flex-1 items-center px-4 py-10">
        <BannedNotice reason={viewer.banReason} bannedAt={viewer.bannedAt} />
      </div>
    );
  }
  if (retryAt && new Date(retryAt).getTime() > Date.now()) {
    return (
      <div className="flex flex-1 items-center px-4 py-10">
        <RateLimitNotice retryAt={retryAt} />
      </div>
    );
  }

  return (
    <>
      {/* empty:hidden removes the padding when there's nothing to upload */}
      <div className="mx-auto w-full max-w-screen-md px-4 pt-3 empty:hidden">
        <LocalRestroomsUpload userId={user.id} returnUrl="/add" />
      </div>
      <AddRestroomForm userId={user.id} />
    </>
  );
}
