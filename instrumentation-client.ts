import * as Sentry from "@sentry/nextjs";

/**
 * Sentry in the browser (loaded before the app by @sentry/nextjs).
 * Off without NEXT_PUBLIC_SENTRY_DSN, so local dev and CI send nothing.
 */
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

Sentry.init({
  dsn,
  enabled: Boolean(dsn),
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.NODE_ENV,
  // Performance traces for 10% of page loads (free tier quota)
  tracesSampleRate: 0.1,
});

// Traces client-side page navigations
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
