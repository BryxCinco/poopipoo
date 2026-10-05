"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, Home, RefreshCw } from "lucide-react";

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
    <div className="mx-auto flex w-full max-w-screen-md flex-1 flex-col items-center justify-center gap-2 px-4 py-12 text-center">
      <AlertTriangle className="h-12 w-12 text-destructive" aria-hidden="true" />
      <h1 className="text-xl font-bold">May nangyaring mali</h1>
      <p className="text-sm text-muted-foreground">
        Hindi ma-load ang page na ito. Baka may problema sa internet o sa server.
      </p>
      <div className="mt-2 flex gap-2">
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
    </div>
  );
}
