import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import { format } from "@/lib/i18n/format";
import { getT } from "@/lib/i18n/server";

export interface LegalSection {
  heading: string;
  items: string[];
}

/** Simple text page for /privacy and /terms (Server Component, in the visitor's language). */
export function LegalPage({ title, intro, sections }: { title: string; intro: string; sections: LegalSection[] }) {
  const t = getT();
  return (
    <article className="mx-auto flex w-full max-w-screen-md flex-col gap-4 px-4 py-6 text-sm leading-relaxed">
      <Link
        href="/about"
        className="-ml-1 flex w-fit items-center gap-1 rounded-md px-1 text-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        {t.legal.backToAbout}
      </Link>
      <header>
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="text-xs text-muted-foreground">{format(t.legal.updated, { date: t.legal.updatedDate })}</p>
      </header>
      <p>{intro}</p>
      {sections.map((section) => (
        <section key={section.heading} className="flex flex-col gap-1.5">
          <h2 className="mt-2 text-base font-semibold">{section.heading}</h2>
          {section.items.length === 1 ? (
            <p>{section.items[0]}</p>
          ) : (
            <ul className="flex flex-col gap-1">
              {section.items.map((item) => (
                <li key={item} className="ml-5 list-disc">
                  {item}
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </article>
  );
}
