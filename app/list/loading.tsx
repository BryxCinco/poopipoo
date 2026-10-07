import { Skeleton } from "@/components/ui/skeleton";

/** Matches the /list layout: title, search, filter chips, cards. */
export default function Loading() {
  return (
    <div className="mx-auto flex w-full max-w-screen-md flex-col gap-3 px-4 py-4" aria-busy="true" aria-label="Naglo-load">
      <Skeleton className="h-7 w-56" />
      <Skeleton className="h-11 w-full rounded-xl" />
      <div className="flex gap-2 overflow-hidden">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-8 w-20 shrink-0 rounded-full" />
        ))}
      </div>
      <Skeleton className="h-4 w-40" />
      {Array.from({ length: 4 }, (_, i) => (
        <Skeleton key={i} className="h-[104px] w-full" />
      ))}
    </div>
  );
}
