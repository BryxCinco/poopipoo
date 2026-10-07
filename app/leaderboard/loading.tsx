import { Skeleton } from "@/components/ui/skeleton";

/** Matches the leaderboard layout: title, subtitle, ranked rows. */
export default function Loading() {
  return (
    <div className="mx-auto flex w-full max-w-screen-md flex-col gap-4 px-4 py-5" aria-busy="true" aria-label="Naglo-load">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-4 w-full max-w-sm" />
      </div>
      <div className="flex flex-col gap-2">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="flex items-center gap-3 rounded-xl border p-3">
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex flex-1 flex-col gap-1.5">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-20" />
            </div>
            <Skeleton className="h-6 w-12" />
          </div>
        ))}
      </div>
    </div>
  );
}
