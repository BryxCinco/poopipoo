import type { MetadataRoute } from "next";

import { CITIES } from "@/lib/cities";
import { getSiteUrl } from "@/lib/metadata";
import { createAnonClient } from "@/lib/supabase/anon";

/**
 * /sitemap.xml — public pages, the city pages and every restroom page.
 * Rebuilt at most once an hour. Uses guest access, so rejected (hidden)
 * restrooms are never listed.
 */
export const revalidate = 3600;

// Google's limit per sitemap file is 50,000 URLs
const MAX_RESTROOMS = 45_000;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getSiteUrl();
  const url = (path: string) => new URL(path, base).toString();

  const pages: MetadataRoute.Sitemap = [
    { url: url("/"), changeFrequency: "daily", priority: 1 },
    { url: url("/list"), changeFrequency: "daily", priority: 0.9 },
    { url: url("/leaderboard"), changeFrequency: "daily", priority: 0.5 },
    ...CITIES.map((city) => ({ url: url(`/city/${city.slug}`), changeFrequency: "weekly" as const, priority: 0.8 })),
    { url: url("/about"), changeFrequency: "monthly", priority: 0.4 },
    { url: url("/privacy"), changeFrequency: "yearly", priority: 0.2 },
    { url: url("/terms"), changeFrequency: "yearly", priority: 0.2 },
  ];

  const { data, error } = await createAnonClient()
    .from("restrooms")
    .select("id, updated_at")
    .neq("status", "rejected")
    .order("updated_at", { ascending: false })
    .limit(MAX_RESTROOMS);
  // A database hiccup shouldn't break the whole sitemap: list the pages anyway
  if (error) {
    console.error("sitemap: could not load restrooms", error.message);
    return pages;
  }

  return [
    ...pages,
    ...data.map((restroom) => ({
      url: url(`/restroom/${restroom.id}`),
      lastModified: new Date(restroom.updated_at),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ];
}
