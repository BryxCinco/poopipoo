import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";

import { BottomNav } from "@/components/layout/BottomNav";
import { Header } from "@/components/layout/Header";

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
        className={`${geistSans.variable} flex min-h-dvh flex-col font-sans antialiased`}
      >
        <Header />
        <main className="mx-auto flex w-full max-w-screen-md flex-1 flex-col">
          {children}
        </main>
        <BottomNav />
      </body>
    </html>
  );
}
