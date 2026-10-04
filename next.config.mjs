import withSerwistInit from "@serwist/next";

// Serwist compiles app/sw.ts into public/sw.js at build time.
// Disabled in dev so the service worker doesn't cache stale pages while developing.
const withSerwist = withSerwistInit({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
});

/** @type {import('next').NextConfig} */
const nextConfig = {};

export default withSerwist(nextConfig);
