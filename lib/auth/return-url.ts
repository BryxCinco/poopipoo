const DEFAULT_RETURN_URL = "/profile";

/**
 * Only allow same-site relative paths as post-login redirects, so a crafted
 * link like /auth/login?returnUrl=https://evil.example can't send users away.
 */
export function safeReturnUrl(value: string | string[] | null | undefined): string {
  const url = Array.isArray(value) ? value[0] : value;
  if (
    !url ||
    !url.startsWith("/") ||
    url.startsWith("//") ||
    url.startsWith("/\\") ||
    url.startsWith("/auth/")
  ) {
    return DEFAULT_RETURN_URL;
  }
  return url;
}

/**
 * Where "Try demo" lands: the map, since the Profile is all zeros and the demo
 * account can't add restrooms. Any other page it came from (e.g. a restroom it
 * wants to review) is kept.
 */
export function demoReturnUrl(value: string | string[] | null | undefined): string {
  const url = safeReturnUrl(value);
  return url.startsWith("/profile") || url.startsWith("/add") ? "/" : url;
}

export function loginUrl(returnUrl: string): string {
  return `/auth/login?returnUrl=${encodeURIComponent(returnUrl)}`;
}
