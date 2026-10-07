import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

/** Simple text page layout for /privacy and /terms. */
export function LegalPage({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  return (
    <article className="mx-auto flex w-full max-w-screen-md flex-col gap-4 px-4 py-6 text-sm leading-relaxed [&_h2]:mt-2 [&_h2]:text-base [&_h2]:font-semibold [&_li]:ml-5 [&_li]:list-disc">
      <Link
        href="/about"
        className="-ml-1 flex w-fit items-center gap-1 rounded-md px-1 text-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        About
      </Link>
      <header>
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="text-xs text-muted-foreground">Huling update: {updated}</p>
      </header>
      {children}
    </article>
  );
}
