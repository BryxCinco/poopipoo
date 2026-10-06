import Link from "next/link";
import { SearchX } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/EmptyState";

export function RestroomNotFound() {
  return (
    <div className="mx-auto flex w-full max-w-screen-md flex-1 flex-col items-center justify-center px-4">
      <EmptyState
        icon={<SearchX />}
        titleAs="h1"
        title="Hindi mahanap ang CR"
        description="Baka na-delete na ito o mali ang link."
        action={
          <Button asChild>
            <Link href="/list">Tingnan ang listahan</Link>
          </Button>
        }
      />
    </div>
  );
}
