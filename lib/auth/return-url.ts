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

export function loginUrl(returnUrl: string): string {
  return `/auth/login?returnUrl=${encodeURIComponent(returnUrl)}`;
}
