import { Skeleton } from "@/components/ui/skeleton";

/**
 * Default loading screen for any page without its own loading.tsx
 * (e.g. /add, /about, a restroom page): a generic page outline.
 */
export default function Loading() {
  return (
    <div className="mx-auto flex w-full max-w-screen-md flex-col gap-4 px-4 py-5" aria-busy="true" aria-label="Naglo-load">
      <Skeleton className="h-7 w-48" />
      <Skeleton className="h-4 w-64" />
      <Skeleton className="h-40 w-full rounded-2xl" />
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-16 w-full" />
    </div>
  );
}
