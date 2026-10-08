import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "leaflet/dist/leaflet.css";
import "./globals.css";

import { BottomNav } from "@/components/layout/BottomNav";
import { Header } from "@/components/layout/Header";
import { Providers } from "@/components/layout/Providers";
import { UnsavedChangesGuard } from "@/components/layout/UnsavedChangesGuard";
import { Toaster } from "@/components/ui/toaster";
import { brandFont } from "@/lib/fonts";
import { HTML_LANG } from "@/lib/i18n/config";
import { getLocale } from "@/lib/i18n/server";
import { rootMetadata } from "@/lib/metadata";
import { THEME_INIT_SCRIPT } from "@/lib/theme";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});

// Title template, description, Open Graph and Twitter defaults (in the visitor's language): see lib/metadata.ts
export function generateMetadata(): Metadata {
  return rootMetadata();
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  // Browser/status bar matches the cream header (dark: the dark background)
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F6F0E6" },
    { media: "(prefers-color-scheme: dark)", color: "#16110D" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Saved language (cookie) or the browser's; see lib/i18n/config.ts
  const locale = getLocale();
  return (
    // suppressHydrationWarning: the theme script may add the "dark" class before React hydrates
    <html lang={HTML_LANG[locale]} suppressHydrationWarning>
      <head>
        {/* Sets light/dark before the first paint (no flash). See lib/theme.ts */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body
        className={`${geistSans.variable} ${brandFont.variable} flex h-dvh flex-col font-sans antialiased`}
      >
        <Providers locale={locale}>
          <Header />
          {/* Fills the space between header and bottom nav; pages scroll inside it.
              Full width so the map can go edge to edge; pages set their own max-width. */}
          <main className="flex min-h-0 w-full flex-1 flex-col overflow-y-auto">
            {children}
          </main>
          <BottomNav />
          <Toaster />
          <UnsavedChangesGuard />
        </Providers>
        {/* Vercel Web Analytics (page views, no cookies) and Speed Insights
            (Core Web Vitals). Only send data on Vercel deployments. */}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
