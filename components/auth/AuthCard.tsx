"use client";

import Image from "next/image";
import { motion } from "framer-motion";

import { CompassRose, CrPin, CurlyArrow } from "@/components/brand/MapDecorations";
import { useI18n } from "@/hooks/use-i18n";
import { scaleIn, slideUp, SPRING } from "@/lib/animations";

/**
 * Shared frame for the login and signup pages, styled like the Poopipoo
 * poster: the logo tile with the rounded wordmark, a curly arrow, compass
 * roses and CR pins on the paper-map background, and a cream form card.
 *
 * Layout: stacked on phones; brand and card side by side (`split`), so a
 * zoomed-in desktop (wide but short viewport) still shows the whole form.
 * `split` = md and up, or a landscape window from 600px (tailwind.config.ts).
 * `short:` (max-height 720px) shrinks the brand so it doesn't push the form down;
 * when the form is taller than the window (signup), the brand stays in view (sticky).
 */
export function AuthCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  const { t } = useI18n();
  return (
    // overflow-x-clip (not overflow-hidden): hides decorations that stick out
    // sideways but keeps the page's natural height, so <main> can scroll to the
    // bottom of the form when the viewport is short (e.g. 200% browser zoom).
    <div className="relative isolate flex flex-1 flex-col overflow-x-clip">
      {/* Decorations (behind everything, never interactive) */}
      <CompassRose className="absolute -left-16 -top-8 -z-10 h-44 w-44 text-ink/25 dark:text-ink/15" />
      <CompassRose className="absolute -right-14 bottom-10 -z-10 h-52 w-52 rotate-12 text-ink/20 dark:text-ink/10" />
      <CrPin className="absolute left-6 top-40 -z-10 h-10 w-8 -rotate-6 text-ink/35 dark:text-ink/20" />
      <CrPin className="absolute bottom-28 left-5 -z-10 h-9 w-7 rotate-6 text-ink/30 dark:text-ink/15" />

      <motion.div
        variants={slideUp}
        initial="hidden"
        animate="visible"
        className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-4 py-8 short:gap-4 short:py-4 split:max-w-4xl split:flex-row split:items-center split:gap-8"
      >
        {/* Brand: logo tile, wordmark, curly arrow pointing at the logo */}
        <div className="relative flex flex-col items-center text-center split:flex-1 split:short:sticky split:short:top-[max(1rem,calc(50%-6rem))] split:short:self-start">
          {/* Soft paper glow so the map pattern doesn't run through the wordmark */}
          <div
            aria-hidden="true"
            className="absolute -inset-x-8 -inset-y-6 -z-[5] bg-[radial-gradient(closest-side,hsl(var(--background))_60%,transparent)]"
          />
          {/* Curly arrow coming in from the right and pointing at the logo, like the poster */}
          <CurlyArrow className="absolute -right-4 top-14 h-24 w-32 -scale-x-100 text-ink/50 short:top-8 short:h-16 short:w-24 dark:text-ink/35" />
          <motion.div variants={scaleIn} initial="hidden" animate="visible" transition={SPRING}>
            <Image
              src="/logo.png"
              alt=""
              width={112}
              height={112}
              priority
              className="h-28 w-28 rounded-[1.75rem] shadow-xl shadow-ink/20 ring-1 ring-ink/10 short:h-20 short:w-20 short:rounded-3xl md:h-36 md:w-36 md:short:h-24 md:short:w-24"
            />
          </motion.div>
          <p className="mt-3 font-brand text-5xl font-bold leading-none text-ink short:mt-2 short:text-4xl md:text-6xl md:short:text-5xl">
            Poopipoo
          </p>
          <p className="mt-2 text-sm font-medium text-ink/80 md:text-base">{t.auth.tagline}</p>
        </div>

        <div className="rounded-3xl border border-ink/15 bg-card/95 p-5 shadow-xl shadow-ink/10 backdrop-blur-sm short:p-4 split:w-[min(24rem,45vw)] split:shrink-0">
          <div className="mb-4 flex flex-col gap-1 text-center short:mb-3">
            <h1 className="text-xl font-bold">{title}</h1>
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          </div>
          {children}
        </div>
      </motion.div>
    </div>
  );
}
