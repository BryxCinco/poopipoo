import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "leaflet/dist/leaflet.css";
import "./globals.css";

import { BottomNav } from "@/components/layout/BottomNav";
import { Header } from "@/components/layout/Header";
import { Providers } from "@/components/layout/Providers";
import { UnsavedChangesGuard } from "@/components/layout/UnsavedChangesGuard";
import { Toaster } from "@/components/ui/toaster";
import { rootMetadata } from "@/lib/metadata";
import { THEME_INIT_SCRIPT } from "@/lib/theme";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});

// Title template, description, Open Graph and Twitter defaults: see lib/metadata.ts
export const metadata: Metadata = rootMetadata;

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#8B4513",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // suppressHydrationWarning: the theme script may add the "dark" class before React hydrates
    <html lang="fil" suppressHydrationWarning>
      <head>
        {/* Sets light/dark before the first paint (no flash). See lib/theme.ts */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body
        className={`${geistSans.variable} flex h-dvh flex-col font-sans antialiased`}
      >
        <Providers>
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
      </body>
    </html>
  );
}
