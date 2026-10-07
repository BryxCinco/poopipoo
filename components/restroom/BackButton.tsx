"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useI18n } from "@/hooks/use-i18n";

/**
 * Goes back in history when there is somewhere to go back to (e.g. came from the
 * map or list). When the page was opened directly — like from a shared link in a
 * new tab — there's no history, so go to `fallbackHref` instead of leaving the app.
 */
export function BackButton({ fallbackHref = "/list" }: { fallbackHref?: string }) {
  const router = useRouter();
  const { t } = useI18n();

  const handleClick = () => {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push(fallbackHref);
    }
  };

  return (
    <Button type="button" variant="ghost" size="sm" onClick={handleClick} className="-ml-2 w-fit">
      <ArrowLeft aria-hidden="true" />
      {t.restroom.back}
    </Button>
  );
}
