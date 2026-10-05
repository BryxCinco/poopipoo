import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AuthCard } from "@/components/auth/AuthCard";
import { SignupForm } from "@/components/auth/SignupForm";
import { safeReturnUrl } from "@/lib/auth/return-url";
import { getCurrentUser } from "@/lib/auth/server";

export const metadata: Metadata = {
  title: "Poopipoo — Mag-sign up",
};

interface SignupPageProps {
  searchParams: { returnUrl?: string | string[] };
}

export default async function SignupPage({ searchParams }: SignupPageProps) {
  const returnUrl = safeReturnUrl(searchParams.returnUrl);

  if (await getCurrentUser()) redirect(returnUrl);

  return (
    <AuthCard title="Gumawa ng account" subtitle="Libre ito. Tulungan ang iba na makahanap ng malinis na CR.">
      <SignupForm returnUrl={returnUrl} />
    </AuthCard>
  );
}
