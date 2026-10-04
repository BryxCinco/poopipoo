import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "leaflet/dist/leaflet.css";
import "./globals.css";

import { BottomNav } from "@/components/layout/BottomNav";
import { Header } from "@/components/layout/Header";
import { Toaster } from "@/components/ui/toaster";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Poopipoo — Saan ang CR?",
  description: "Crowdsourced restroom finder for the Philippines",
  applicationName: "Poopipoo",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "Poopipoo",
    statusBarStyle: "default",
  },
};

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
    <html lang="fil">
      <body
        className={`${geistSans.variable} flex h-dvh flex-col font-sans antialiased`}
      >
        <Header />
        {/* Fills the space between header and bottom nav; pages scroll inside it.
            Full width so the map can go edge to edge; pages set their own max-width. */}
        <main className="flex min-h-0 w-full flex-1 flex-col overflow-y-auto">
          {children}
        </main>
        <BottomNav />
        <Toaster />
      </body>
    </html>
  );
}
