import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AuthCard } from "@/components/auth/AuthCard";
import { LoginForm } from "@/components/auth/LoginForm";
import { TryDemoButton } from "@/components/auth/TryDemoButton";
import { getDemoUserId } from "@/lib/auth/demo";
import { safeReturnUrl } from "@/lib/auth/return-url";
import { getCurrentUser } from "@/lib/auth/server";
import { getT } from "@/lib/i18n/server";
import { pageMetadata } from "@/lib/metadata";

export function generateMetadata(): Metadata {
  const { title, description } = getT().meta.login;
  return pageMetadata({ title, description, path: "/auth/login" });
}

interface LoginPageProps {
  searchParams: { returnUrl?: string | string[]; error?: string | string[] };
}


export default async function LoginPage({ searchParams }: LoginPageProps) {
  const returnUrl = safeReturnUrl(searchParams.returnUrl);

  // Already signed in: skip the form
  if (await getCurrentUser()) redirect(returnUrl);

  const t = getT().auth.login;
  // Only known error keys from the URL are shown
  const initialError = searchParams.error === "confirm" ? "confirm" : null;

  return (
    <AuthCard title={t.title} subtitle={t.subtitle}>
      <LoginForm returnUrl={returnUrl} initialError={initialError} />
      {getDemoUserId() && <TryDemoButton returnUrl={returnUrl} />}
    </AuthCard>
  );
}
