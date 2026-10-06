"use client";

import { useEffect, useRef } from "react";
import { animate, useReducedMotion } from "framer-motion";

import { DURATION, EASE_OUT } from "@/lib/animations";

/**
 * Number that counts up from 0 (or from its previous value) when it changes.
 * Writes to the DOM directly instead of re-rendering every frame.
 * Server-renders the final value, so it's correct without JavaScript.
 */
export function CountUp({ value, className }: { value: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const previous = useRef(0);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (reduceMotion) {
      node.textContent = String(value);
      previous.current = value;
      return;
    }
    const controls = animate(previous.current, value, {
      duration: DURATION.slow,
      ease: EASE_OUT,
      onUpdate: (latest) => {
        node.textContent = String(Math.round(latest));
      },
    });
    previous.current = value;
    return () => controls.stop();
  }, [value, reduceMotion]);

  return (
    <span ref={ref} className={className}>
      {value}
    </span>
  );
}
