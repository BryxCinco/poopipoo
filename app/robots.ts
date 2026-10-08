import type { MetadataRoute } from "next";

import { getSiteUrl } from "@/lib/metadata";

/**
 * /robots.txt — everything public can be crawled. Personal and internal pages
 * are left out (they need a login anyway, or are API endpoints).
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/auth/", "/add", "/profile", "/settings", "/moderation"],
    },
    sitemap: new URL("/sitemap.xml", getSiteUrl()).toString(),
  };
}
