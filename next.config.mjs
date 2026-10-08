import withSerwistInit from "@serwist/next";

// Serwist compiles app/sw.ts into public/sw.js at build time.
// Disabled in dev so the service worker doesn't cache stale pages while developing.
const withSerwist = withSerwistInit({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
});

// Security headers on every response. (No Content-Security-Policy yet: the
// theme script is inline and tiles/routing/geocoding come from several
// hosts, so a CSP needs its own careful testing.)
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // The app is never meant to be shown inside another site's frame
  { key: "X-Frame-Options", value: "DENY" },
  // Location is used by the app itself; nothing else needs camera/mic/etc.
  { key: "Permissions-Policy", value: "geolocation=(self), camera=(), microphone=(), payment=(), usb=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000" },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Local embeddings (lib/ai/local-embeddings.ts) use ONNX Runtime's native
    // addon: load it from node_modules instead of bundling it with webpack.
    serverComponentsExternalPackages: ["@huggingface/transformers", "onnxruntime-node", "sharp"],
    // Keep the serverless functions small (Vercel limit 250 MB): Vercel runs
    // Linux, so the Windows/macOS binaries and the browser (WASM) runtime aren't needed.
    outputFileTracingExcludes: {
      "*": [
        "node_modules/onnxruntime-web/**",
        "node_modules/onnxruntime-node/bin/napi-v*/darwin/**",
        "node_modules/onnxruntime-node/bin/napi-v*/win32/**",
        "node_modules/@img/sharp-darwin*/**",
        "node_modules/@img/sharp-win32*/**",
        "node_modules/@huggingface/transformers/.cache/**",
      ],
    },
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default withSerwist(nextConfig);
