import type { Metadata } from "next";

/**
 * Shared page metadata (title, description, Open Graph, Twitter card).
 *
 * The share image comes from app/opengraph-image.tsx (file-based, applies to
 * every page). Note: a page's `openGraph` object replaces the root one instead
 * of merging, so pageMetadata() repeats the site-wide fields.
 */

export const SITE_NAME = "Poopipoo";
export const SITE_DESCRIPTION =
  "Hanapin ang pinakamalapit na malinis na CR sa Pilipinas. Crowdsourced restroom finder: mapa, reviews, direksyon at AI assistant.";

/** Absolute site URL for Open Graph links (Vercel sets VERCEL_PROJECT_PRODUCTION_URL at build time). */
export function getSiteUrl(): URL {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return new URL(explicit);
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercel) return new URL(`https://${vercel}`);
  return new URL(`http://localhost:${process.env.PORT ?? 3000}`);
}

// The image from app/opengraph-image.tsx. Listed explicitly because a page's
// own openGraph/twitter objects drop the file-based image otherwise.
const SHARE_IMAGE = {
  url: "/opengraph-image",
  width: 1200,
  height: 630,
  alt: "Poopipoo — Saan ang CR? Crowdsourced restroom finder para sa Pilipinas",
};

const OPEN_GRAPH_DEFAULTS = {
  siteName: SITE_NAME,
  locale: "fil_PH",
  type: "website",
  images: SHARE_IMAGE,
} as const;

interface PageMetadataInput {
  /** Page title without the site name (the layout adds " — Poopipoo") */
  title: string;
  description: string;
  /** Path of the page, e.g. "/list" */
  path: string;
}

export function pageMetadata({ title, description, path }: PageMetadataInput): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { ...OPEN_GRAPH_DEFAULTS, title: `${title} — ${SITE_NAME}`, description, url: path },
    twitter: { card: "summary_large_image", title: `${title} — ${SITE_NAME}`, description, images: [SHARE_IMAGE] },
  };
}

/** Root layout defaults (used as-is by pages that set no metadata, like the map). */
export const rootMetadata: Metadata = {
  metadataBase: getSiteUrl(),
  title: { default: "Poopipoo — Saan ang CR?", template: `%s — ${SITE_NAME}` },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: ["CR", "restroom", "banyo", "comfort room", "Philippines", "Pilipinas", "toilet finder"],
  openGraph: { ...OPEN_GRAPH_DEFAULTS, title: "Poopipoo — Saan ang CR?", description: SITE_DESCRIPTION, url: "/" },
  twitter: { card: "summary_large_image", title: "Poopipoo — Saan ang CR?", description: SITE_DESCRIPTION },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: SITE_NAME,
    statusBarStyle: "default",
  },
};
