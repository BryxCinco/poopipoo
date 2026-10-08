import type { Metadata } from "next";

import { OG_LOCALE } from "@/lib/i18n/config";
import { getLocale, getT } from "@/lib/i18n/server";

/**
 * Server only. Shared page metadata (title, description, Open Graph, Twitter
 * card), in the visitor's language.
 *
 * The share image comes from app/opengraph-image.tsx. Note: a page's
 * `openGraph` object replaces the root one instead of merging, so
 * pageMetadata() repeats the site-wide fields.
 */

export const SITE_NAME = "Poopipoo";

/** Absolute site URL for Open Graph links (Vercel sets VERCEL_PROJECT_PRODUCTION_URL at build time). */
export function getSiteUrl(): URL {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return new URL(explicit);
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercel) return new URL(`https://${vercel}`);
  return new URL(`http://localhost:${process.env.PORT ?? 3000}`);
}

/** The image from app/opengraph-image.tsx. Listed explicitly because a page's
 * own openGraph/twitter objects drop the file-based image otherwise. */
function shareImage() {
  return { url: "/opengraph-image", width: 1200, height: 630, alt: getT().meta.shareImageAlt };
}

function openGraphDefaults() {
  return {
    siteName: SITE_NAME,
    locale: OG_LOCALE[getLocale()],
    type: "website" as const,
    images: shareImage(),
  };
}

interface PageMetadataInput {
  /** Page title without the site name (the layout adds " — Poopipoo") */
  title: string;
  description: string;
  /** Path of the page, e.g. "/list" */
  path: string;
}

export function pageMetadata({ title, description, path }: PageMetadataInput): Metadata {
  const fullTitle = `${title} — ${SITE_NAME}`;
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { ...openGraphDefaults(), title: fullTitle, description, url: path },
    twitter: { card: "summary_large_image", title: fullTitle, description, images: [shareImage()] },
  };
}

/** Root layout defaults (used as-is by pages that set no metadata, like the map). */
export function rootMetadata(): Metadata {
  const t = getT().meta;
  return {
    metadataBase: getSiteUrl(),
    title: { default: t.siteTitle, template: `%s — ${SITE_NAME}` },
    description: t.siteDescription,
    applicationName: SITE_NAME,
    keywords: ["CR", "restroom", "banyo", "comfort room", "Philippines", "Pilipinas", "toilet finder"],
    // The map (home). Every other page sets its own canonical via pageMetadata().
    alternates: { canonical: "/" },
    openGraph: { ...openGraphDefaults(), title: t.siteTitle, description: t.siteDescription, url: "/" },
    twitter: { card: "summary_large_image", title: t.siteTitle, description: t.siteDescription },
    manifest: "/manifest.json",
    appleWebApp: {
      capable: true,
      title: SITE_NAME,
      statusBarStyle: "default",
    },
  };
}
