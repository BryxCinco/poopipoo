import * as Sentry from "@sentry/nextjs";

/** Sentry on the Node.js server (route handlers, Server Components). See instrumentation.ts. */
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

Sentry.init({
  dsn,
  enabled: Boolean(dsn),
  environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
  tracesSampleRate: 0.1,
});
