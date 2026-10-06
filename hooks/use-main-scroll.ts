"use client";

import { useEffect } from "react";
import { useMotionValue, type MotionValue } from "framer-motion";

/**
 * Scroll position of the app's <main> element (the page scroll container in
 * app/layout.tsx; the window itself doesn't scroll) as a Framer MotionValue,
 * for scroll-linked effects like parallax. Updates without re-rendering.
 */
export function useMainScrollY(): MotionValue<number> {
  const scrollY = useMotionValue(0);

  useEffect(() => {
    const main = document.querySelector("main");
    if (!main) return;
    const update = () => scrollY.set(main.scrollTop);
    update();
    main.addEventListener("scroll", update, { passive: true });
    return () => main.removeEventListener("scroll", update);
  }, [scrollY]);

  return scrollY;
}
