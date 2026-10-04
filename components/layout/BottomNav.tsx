"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { List, Map, Plus, User, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

// Note: /list, /add, and /profile routes don't exist yet (later phases).
const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Map", icon: Map },
  { href: "/list", label: "List", icon: List },
  { href: "/add", label: "Add", icon: Plus },
  { href: "/profile", label: "Profile", icon: User },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="sticky bottom-0 z-40 w-full border-t bg-background pb-[env(safe-area-inset-bottom)]">
      <ul className="mx-auto grid h-16 max-w-screen-md grid-cols-4">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href;
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex h-full flex-col items-center justify-center gap-1 text-xs transition-colors",
                  isActive
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
