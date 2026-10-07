"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, Home, RefreshCw } from "lucide-react";

import { StatusScreen } from "@/components/layout/StatusScreen";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/hooks/use-i18n";

/** Error boundary for every page under the root layout (header/nav stay visible). */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useI18n();
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <StatusScreen
      code="Oops"
      tone="error"
      icon={<AlertTriangle />}
      title={t.status.errorTitle}
      description={t.status.errorDescription}
      actions={
        <>
          <Button size="lg" onClick={reset}>
            <RefreshCw aria-hidden="true" />
            {t.common.retry}
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/">
              <Home aria-hidden="true" />
              {t.status.backHome}
            </Link>
          </Button>
        </>
      }
    />
  );
}
