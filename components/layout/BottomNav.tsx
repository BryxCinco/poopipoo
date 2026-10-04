"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { List, Map, Plus, User, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Extra path prefixes that should also highlight this tab. */
  matchPrefixes?: string[];
};

// Note: /add and /profile don't exist yet (Phase 4).
const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Map", icon: Map },
  // Restroom detail pages are reached from the list, so keep "List" highlighted there.
  { href: "/list", label: "List", icon: List, matchPrefixes: ["/restroom"] },
  { href: "/add", label: "Add", icon: Plus },
  { href: "/profile", label: "Profile", icon: User },
];

function isActive(pathname: string, { href, matchPrefixes = [] }: NavItem): boolean {
  if (href === "/") return pathname === "/";
  return [href, ...matchPrefixes].some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="sticky bottom-0 z-40 w-full border-t bg-background pb-[env(safe-area-inset-bottom)]">
      <ul className="mx-auto grid h-16 max-w-screen-md grid-cols-4">
        {NAV_ITEMS.map((item) => {
          const { href, label, icon: Icon } = item;
          const active = isActive(pathname, item);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-full flex-col items-center justify-center gap-1 text-xs transition-colors",
                  active
                    ? "font-semibold text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="h-5 w-5" aria-hidden="true" />
                <span>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
