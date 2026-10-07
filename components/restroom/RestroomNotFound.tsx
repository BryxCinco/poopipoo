"use client";

import Link from "next/link";
import { SearchX } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/EmptyState";
import { useI18n } from "@/hooks/use-i18n";

export function RestroomNotFound() {
  const { t } = useI18n();
  return (
    <div className="mx-auto flex w-full max-w-screen-md flex-1 flex-col items-center justify-center px-4">
      <EmptyState
        icon={<SearchX />}
        titleAs="h1"
        title={t.status.restroomNotFoundTitle}
        description={t.status.restroomNotFoundDescription}
        action={
          <Button asChild>
            <Link href="/list">{t.status.viewList}</Link>
          </Button>
        }
      />
    </div>
  );
}
