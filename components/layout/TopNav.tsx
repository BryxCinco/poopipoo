"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";

import { isNavItemActive, NAV_ITEMS } from "@/components/layout/nav-items";
import { useI18n } from "@/hooks/use-i18n";
import { SPRING } from "@/lib/animations";
import { cn } from "@/lib/utils";

/** Main navigation in the header on md and up; phones use BottomNav. */
export function TopNav() {
  const pathname = usePathname();
  const { t } = useI18n();

  return (
    <nav aria-label={t.nav.label} className="ml-auto hidden md:block">
      <ul className="flex items-center gap-1">
        {NAV_ITEMS.map((item) => {
          const { href, label, icon: Icon, primary } = item;
          const active = isNavItemActive(pathname, item);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  primary
                    ? "ml-2 bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
                    : active
                      ? "font-semibold text-primary"
                      : "text-muted-foreground hover:text-foreground"
                )}
              >
                {/* Same sliding pill as the bottom bar */}
                {active && !primary && (
                  <motion.span
                    layoutId="top-nav-active"
                    transition={SPRING}
                    className="absolute inset-0 rounded-full bg-primary/10"
                    aria-hidden="true"
                  />
                )}
                <Icon className="relative h-4 w-4" aria-hidden="true" />
                <span className="relative">{t.nav[label]}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
