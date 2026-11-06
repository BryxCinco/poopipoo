import { List, Map, Plus, User, type LucideIcon } from "lucide-react";

/** Main navigation, shared by the bottom bar (phones) and the top bar (md and up). */
export type NavItem = {
  href: string;
  /** Key in t.nav */
  label: "map" | "list" | "add" | "profile";
  icon: LucideIcon;
  /** Extra path prefixes that should also highlight this tab. */
  matchPrefixes?: string[];
  /** The primary action (raised round button at the bottom, solid at the top). */
  primary?: boolean;
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "map", icon: Map },
  // Restroom detail pages are reached from the list, so keep "List" highlighted there.
  { href: "/list", label: "list", icon: List, matchPrefixes: ["/restroom"] },
  { href: "/add", label: "add", icon: Plus, primary: true },
  { href: "/profile", label: "profile", icon: User },
];

export function isNavItemActive(pathname: string, { href, matchPrefixes = [] }: NavItem): boolean {
  if (href === "/") return pathname === "/";
  return [href, ...matchPrefixes].some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}
