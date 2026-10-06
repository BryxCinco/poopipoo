"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, Home, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/EmptyState";

/** Error boundary for every page under the root layout (header/nav stay visible). */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex w-full max-w-screen-md flex-1 flex-col items-center justify-center px-4">
      <EmptyState
        icon={<AlertTriangle />}
        tone="error"
        role="alert"
        titleAs="h1"
        title="May nangyaring mali"
        description="Hindi ma-load ang page na ito. Baka may problema sa internet o sa server."
        action={
          <div className="flex gap-2">
            <Button onClick={reset}>
              <RefreshCw aria-hidden="true" />
              Subukan ulit
            </Button>
            <Button asChild variant="outline">
              <Link href="/">
                <Home aria-hidden="true" />
                Home
              </Link>
            </Button>
          </div>
        }
      />
    </div>
  );
}
