import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, Map, MapPin } from "lucide-react";

import { PriceBadge } from "@/components/restroom/RestroomBadges";
import { RestroomRating } from "@/components/restroom/RestroomRating";
import { Button } from "@/components/ui/button";
import { CITIES, getCity } from "@/lib/cities";
import { format, plural } from "@/lib/i18n/format";
import { getT } from "@/lib/i18n/server";
import { pageMetadata } from "@/lib/metadata";
import { countRestroomsByCity, getCityRestrooms } from "@/lib/restrooms/cities";

/**
 * /city/[slug] — public restrooms in one city (lib/cities.ts). Mostly for
 * search engines and sharing ("CR in Cebu"); the map is the main way to browse.
 * Lists the top-rated restrooms, each linking to its detail page.
 */

// Long lists hurt more than they help; the map shows everything
const LIST_LIMIT = 100;

interface CityPageProps {
  params: { slug: string };
}

export async function generateMetadata({ params }: CityPageProps): Promise<Metadata> {
  const city = getCity(params.slug);
  // Same as the restroom page: the not-found page with noindex (a soft 404,
  // since the root loading.tsx starts streaming before this runs)
  if (!city) notFound();
  const t = getT().meta.city;
  const counts = await countRestroomsByCity([city]);
  return pageMetadata({
    title: format(t.title, { city: city.name }),
    description: format(t.description, { city: city.name, count: counts[city.slug] ?? 0 }),
    path: `/city/${city.slug}`,
  });
}

export default async function CityPage({ params }: CityPageProps) {
  const city = getCity(params.slug);
  if (!city) notFound();

  const t = getT();
  const tc = t.city;
  const { restrooms, total } = await getCityRestrooms(city, LIST_LIMIT);
  const others = CITIES.filter((other) => other.slug !== city.slug);

  return (
    <div className="mx-auto flex w-full max-w-screen-md flex-col gap-5 px-4 py-5">
      <header className="flex flex-col gap-2 rounded-2xl border bg-card p-4 shadow-sm">
        <h1 className="flex items-center gap-2 text-xl font-bold">
          <MapPin className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
          {format(tc.heading, { city: city.name })}
        </h1>
        <p className="text-sm font-medium">{plural(tc.count, total)}</p>
        <p className="text-sm text-muted-foreground">{tc.intro}</p>
        <Button asChild variant="outline" className="mt-1 w-full sm:w-fit">
          <Link href="/">
            <Map aria-hidden="true" />
            {tc.openMap}
          </Link>
        </Button>
      </header>

      {restrooms.length === 0 ? (
        <p className="rounded-xl border border-dashed bg-card/80 p-5 text-center text-sm text-muted-foreground">
          {tc.empty}
        </p>
      ) : (
        <section className="flex flex-col gap-2" aria-label={format(tc.listLabel, { city: city.name })}>
          {total > restrooms.length && (
            <p className="text-xs text-muted-foreground">{format(tc.topRated, { shown: restrooms.length })}</p>
          )}
          <ul className="divide-y overflow-hidden rounded-xl border bg-card shadow-sm">
            {restrooms.map((restroom) => (
              <li key={restroom.id}>
                <Link
                  href={`/restroom/${restroom.id}`}
                  className="group flex items-center gap-3 px-3 py-3 transition-colors duration-150 hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none"
                >
                  <span className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="truncate font-medium">{restroom.name}</span>
                    <span className="truncate text-xs text-muted-foreground">{restroom.address}</span>
                    <span className="flex flex-wrap items-center gap-2">
                      <RestroomRating rating={restroom.rating} reviewCount={restroom.review_count} size="sm" />
                      <PriceBadge isFree={restroom.is_free} />
                    </span>
                  </span>
                  <ChevronRight
                    className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-150 group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <nav aria-labelledby="other-cities-heading" className="flex flex-col gap-2">
        <h2 id="other-cities-heading" className="font-semibold">
          {tc.otherCities}
        </h2>
        <ul className="flex flex-wrap gap-2">
          {others.map((other) => (
            <li key={other.slug}>
              <Link
                href={`/city/${other.slug}`}
                className="inline-flex min-h-10 items-center rounded-full border bg-card px-4 text-sm font-medium shadow-sm transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {other.name}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
