/**
 * Runs once when the server starts (Next.js 14 needs
 * experimental.instrumentationHook in next.config.mjs). Loads the Sentry
 * config for the runtime this server instance is.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") await import("./sentry.server.config");
  if (process.env.NEXT_RUNTIME === "edge") await import("./sentry.edge.config");
}
