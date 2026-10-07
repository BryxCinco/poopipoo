import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AddRestroomForm } from "@/components/add/AddRestroomForm";
import { LocalRestroomsUpload } from "@/components/restroom/LocalRestroomsUpload";
import { loginUrl } from "@/lib/auth/return-url";
import { getCurrentUser } from "@/lib/auth/server";
import { pageMetadata } from "@/lib/metadata";

export const metadata: Metadata = pageMetadata({
  title: "Magdagdag ng CR",
  description: "May alam kang CR? I-share sa iba: lokasyon, amenities at kung libre ito.",
  path: "/add",
});

export default async function AddPage() {
  const user = await getCurrentUser();
  // Adding requires an account (RLS also enforces this on insert)
  if (!user) redirect(loginUrl("/add"));

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
