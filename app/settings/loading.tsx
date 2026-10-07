import { Skeleton } from "@/components/ui/skeleton";
import { getT } from "@/lib/i18n/server";

/** Matches the settings layout: account card, then grouped rows. */
export default function Loading() {
  return (
    <div className="mx-auto flex w-full max-w-screen-md flex-col gap-6 px-4 py-5" aria-busy="true" aria-label={getT().common.loading}>
      <Skeleton className="h-7 w-32" />
      <div className="flex flex-col gap-2">
        <Skeleton className="h-5 w-20" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-5 w-28" />
        <Skeleton className="h-44 w-full rounded-xl" />
      </div>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-5 w-20" />
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
    </div>
  );
}
