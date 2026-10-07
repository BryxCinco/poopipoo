import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AuthCard } from "@/components/auth/AuthCard";
import { LoginForm } from "@/components/auth/LoginForm";
import { safeReturnUrl } from "@/lib/auth/return-url";
import { getCurrentUser } from "@/lib/auth/server";
import { pageMetadata } from "@/lib/metadata";

export const metadata: Metadata = pageMetadata({
  title: "Mag-login",
  description: "Mag-login sa Poopipoo para makapag-add ng CR, mag-review at makakuha ng points.",
  path: "/auth/login",
});

interface LoginPageProps {
  searchParams: { returnUrl?: string | string[]; error?: string | string[] };
}

const URL_ERRORS: Record<string, string> = {
  confirm: "Hindi ma-confirm ang email. Baka expired na ang link — mag-login o mag-sign up ulit.",
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const returnUrl = safeReturnUrl(searchParams.returnUrl);

  // Already signed in: skip the form
  if (await getCurrentUser()) redirect(returnUrl);

  const errorKey = typeof searchParams.error === "string" ? searchParams.error : null;

  return (
    <AuthCard title="Mag-login" subtitle="Para makapag-add ng CR at ma-save ang contributions mo.">
      <LoginForm returnUrl={returnUrl} initialError={errorKey ? (URL_ERRORS[errorKey] ?? null) : null} />
    </AuthCard>
  );
}
