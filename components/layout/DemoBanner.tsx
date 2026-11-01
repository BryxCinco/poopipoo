"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { useAuthUser } from "@/hooks/use-auth-user";
import { useI18n } from "@/hooks/use-i18n";
import { isDemoUser } from "@/lib/auth/demo";
import { createClient } from "@/lib/supabase/client";

/**
 * Strip under the header while signed in to the demo account (lib/auth/demo.ts).
 * "Sign up" signs out of the demo first, since the signup page is for guests.
 */
export function DemoBanner() {
  const router = useRouter();
  const { user } = useAuthUser();
  const { t } = useI18n();
  const [pending, setPending] = useState(false);

  if (!isDemoUser(user)) return null;

  const signUp = async () => {
    setPending(true);
    await createClient()
      .auth.signOut()
      .catch(() => undefined);
    router.push("/auth/signup");
    router.refresh();
  };

  return (
    <div role="status" className="border-b bg-primary/10 px-4 py-2 text-xs">
      <p className="mx-auto flex max-w-screen-md flex-wrap items-center justify-center gap-x-2 gap-y-1 text-center">
        <span>{t.demo.banner}</span>
        <button
          type="button"
          onClick={() => void signUp()}
          disabled={pending}
          className="rounded font-semibold underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
        >
          {t.demo.bannerSignup}
        </button>
      </p>
    </div>
  );
}
