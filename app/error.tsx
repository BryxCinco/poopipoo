"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, Home, RefreshCw } from "lucide-react";

import { StatusScreen } from "@/components/layout/StatusScreen";
import { Button } from "@/components/ui/button";

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
    <StatusScreen
      code="Oops"
      tone="error"
      icon={<AlertTriangle />}
      title="May nangyaring mali"
      description="Hindi ma-load ang page na ito. Baka may problema sa internet o sa server. Subukan ulit."
      actions={
        <>
          <Button size="lg" onClick={reset}>
            <RefreshCw aria-hidden="true" />
            Subukan ulit
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/">
              <Home aria-hidden="true" />
              Bumalik sa home
            </Link>
          </Button>
        </>
      }
    />
  );
}
