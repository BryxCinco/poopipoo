/**
 * CSRF defense for POST API routes (in addition to the session cookies being
 * SameSite=Lax, which browsers don't send on cross-site POSTs).
 *
 * Browsers send an Origin header with every POST from a page. If it's there
 * and it isn't this site, the request came from another website: refuse it.
 * Requests without Origin (curl, server-to-server) carry no browser cookies,
 * so they're treated as signed-out by the routes anyway.
 */
export function isCrossSiteRequest(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
    return new URL(origin).host !== host;
  } catch {
    return true; // malformed Origin
  }
}
