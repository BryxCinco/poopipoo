import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AuthCard } from "@/components/auth/AuthCard";
import { SignupForm } from "@/components/auth/SignupForm";
import { TryDemoButton } from "@/components/auth/TryDemoButton";
import { getDemoUserId } from "@/lib/auth/demo";
import { safeReturnUrl } from "@/lib/auth/return-url";
import { getCurrentUser } from "@/lib/auth/server";
import { getT } from "@/lib/i18n/server";
import { pageMetadata } from "@/lib/metadata";

export function generateMetadata(): Metadata {
  const { title, description } = getT().meta.signup;
  return pageMetadata({ title, description, path: "/auth/signup" });
}

interface SignupPageProps {
  searchParams: { returnUrl?: string | string[] };
}

export default async function SignupPage({ searchParams }: SignupPageProps) {
  const returnUrl = safeReturnUrl(searchParams.returnUrl);

  if (await getCurrentUser()) redirect(returnUrl);

  return (
    <AuthCard title={getT().auth.signup.title} subtitle={getT().auth.signup.subtitle}>
      <SignupForm returnUrl={returnUrl} />
      {getDemoUserId() && <TryDemoButton returnUrl={returnUrl} />}
    </AuthCard>
  );
}
