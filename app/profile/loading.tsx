import { Skeleton } from "@/components/ui/skeleton";
import { getT } from "@/lib/i18n/server";

/** Matches the profile layout: identity, level card, stats, badges, lists. */
export default function Loading() {
  return (
    <div className="mx-auto flex w-full max-w-screen-md flex-col gap-6 px-4 py-5" aria-busy="true" aria-label={getT().common.loading}>
      <div className="flex items-center gap-4">
        <Skeleton className="h-16 w-16 rounded-full" />
        <div className="flex flex-1 flex-col gap-2">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-48" />
        </div>
      </div>
      <Skeleton className="h-40 w-full rounded-2xl" />
      <div className="grid grid-cols-3 gap-2">
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-[88px] w-full" />
        ))}
      </div>
      <Skeleton className="h-5 w-24" />
      <div className="grid grid-cols-3 gap-2">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-[120px] w-full" />
        ))}
      </div>
      <Skeleton className="h-16 w-full" />
    </div>
  );
}
