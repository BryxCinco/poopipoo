import Link from "next/link";
import { SearchX } from "lucide-react";

import { Button } from "@/components/ui/button";

export function RestroomNotFound() {
  return (
    <div className="mx-auto flex w-full max-w-screen-md flex-1 flex-col items-center justify-center gap-2 px-4 py-12 text-center">
      <SearchX className="h-12 w-12 text-muted-foreground" aria-hidden="true" />
      <h1 className="text-xl font-bold">Hindi mahanap ang CR</h1>
      <p className="text-sm text-muted-foreground">Baka na-delete na ito o mali ang link.</p>
      <Button asChild className="mt-2">
        <Link href="/list">Tingnan ang listahan</Link>
      </Button>
    </div>
  );
}
