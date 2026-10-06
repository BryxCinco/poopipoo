"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { List, Map, Plus, User, type LucideIcon } from "lucide-react";

import { SPRING } from "@/lib/animations";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Extra path prefixes that should also highlight this tab. */
  matchPrefixes?: string[];
  /** Render as the raised, round primary action button. */
  primary?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Map", icon: Map },
  // Restroom detail pages are reached from the list, so keep "List" highlighted there.
  { href: "/list", label: "List", icon: List, matchPrefixes: ["/restroom"] },
  { href: "/add", label: "Add", icon: Plus, primary: true },
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
    <nav
      aria-label="Pangunahing navigation"
      className="sticky bottom-0 z-40 w-full border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur supports-[backdrop-filter]:bg-background/80"
    >
      <ul className="mx-auto grid h-16 max-w-screen-md grid-cols-4">
        {NAV_ITEMS.map((item) => {
          const { href, label, icon: Icon, primary } = item;
          const active = isActive(pathname, item);

          if (primary) {
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className="group flex h-full flex-col items-center justify-end gap-1 pb-1.5 text-xs focus-visible:outline-none"
                >
                  {/* Raised circle that overlaps the top edge of the nav */}
                  <motion.span
                    whileHover={{ scale: 1.05, rotate: 90 }}
                    whileTap={{ scale: 0.92 }}
                    transition={SPRING}
                    className={cn(
                      "-mt-6 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg ring-4 ring-background transition-shadow group-hover:shadow-xl group-focus-visible:ring-ring",
                      active && "ring-primary/25"
                    )}
                  >
                    <Icon className="h-6 w-6" aria-hidden="true" />
                  </motion.span>
                  <span className={cn(active ? "font-semibold text-foreground" : "text-muted-foreground")}>
                    {label}
                  </span>
                </Link>
              </li>
            );
          }

          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group relative flex h-full flex-col items-center justify-center gap-1 text-xs transition-colors duration-150 focus-visible:outline-none",
                  active
                    ? "font-semibold text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {/* Active indicator: one pill that slides between tabs (shared layoutId) */}
                {active && (
                  <motion.span
                    layoutId="bottom-nav-active"
                    transition={SPRING}
                    className="absolute top-1.5 h-8 w-14 rounded-full bg-primary/10"
                    aria-hidden="true"
                  />
                )}
                <Icon
                  className="relative h-5 w-5 transition-transform duration-150 group-hover:scale-110 group-active:scale-95 group-focus-visible:scale-110"
                  aria-hidden="true"
                />
                <span className="relative group-focus-visible:underline">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
