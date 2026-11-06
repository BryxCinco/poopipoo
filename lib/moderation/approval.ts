export type ApprovalKind = "community" | "osm" | "approved";

/**
 * What an approved restroom can honestly claim. "approved" alone only means it
 * passed moderation or was imported; only real confirmations make it verified.
 */
export function approvalKind(verifiedCount: number | null | undefined, source: string | null | undefined): ApprovalKind {
  if ((verifiedCount ?? 0) > 0) return "community";
  return source === "osm" ? "osm" : "approved";
}
