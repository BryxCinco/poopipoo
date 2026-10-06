import type { Transition, Variants } from "framer-motion";

/**
 * Reusable Framer Motion variants.
 *
 * Timing rules: every animation is 300ms or less (most are 150–250ms) and uses
 * an ease-out curve, so the UI feels quick rather than floaty. Reduced motion
 * is handled globally by <MotionConfig reducedMotion="user"> (transforms are
 * skipped; opacity fades remain).
 *
 * Usage: <motion.div variants={fadeIn} initial="hidden" animate="visible" exit="exit" />
 */

export const DURATION = {
  fast: 0.15,
  base: 0.2,
  slow: 0.3,
} as const;

/** Ease-out (decelerate) for things entering, ease-in for things leaving. */
export const EASE_OUT: Transition["ease"] = [0.16, 1, 0.3, 1];
export const EASE_IN: Transition["ease"] = [0.7, 0, 0.84, 0];

/** Snappy spring for taps and small UI movements (settles in about 250ms). */
export const SPRING: Transition = { type: "spring", stiffness: 500, damping: 35, mass: 0.6 };

const enter = (duration: number = DURATION.base): Transition => ({ duration, ease: EASE_OUT });
const leave: Transition = { duration: DURATION.fast, ease: EASE_IN };

// ---------- fades ----------

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: enter() },
  exit: { opacity: 0, transition: leave },
};

/** The reverse of fadeIn, for elements that only animate out. */
export const fadeOut: Variants = {
  visible: { opacity: 1 },
  exit: { opacity: 0, transition: leave },
};

// ---------- slides ----------

export const slideUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: enter(DURATION.slow) },
  exit: { opacity: 0, y: 16, transition: leave },
};

export const slideDown: Variants = {
  hidden: { opacity: 0, y: -16 },
  visible: { opacity: 1, y: 0, transition: enter(DURATION.slow) },
  exit: { opacity: 0, y: -16, transition: leave },
};

export const slideLeft: Variants = {
  hidden: { opacity: 0, x: 24 },
  visible: { opacity: 1, x: 0, transition: enter(DURATION.slow) },
  exit: { opacity: 0, x: -24, transition: leave },
};

export const slideRight: Variants = {
  hidden: { opacity: 0, x: -24 },
  visible: { opacity: 1, x: 0, transition: enter(DURATION.slow) },
  exit: { opacity: 0, x: 24, transition: leave },
};

/**
 * Direction-aware slide for multi-step forms: pass `custom={1}` when going
 * forward and `custom={-1}` when going back.
 */
export const stepSlide: Variants = {
  hidden: (direction: number) => ({ opacity: 0, x: direction * 32 }),
  visible: { opacity: 1, x: 0, transition: enter(DURATION.slow) },
  exit: (direction: number) => ({ opacity: 0, x: direction * -32, transition: leave }),
};

// ---------- scale ----------

/** Modals and popovers: grow slightly while fading in. */
export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1, transition: enter() },
  exit: { opacity: 0, scale: 0.95, transition: leave },
};

export const scaleOut: Variants = {
  visible: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.9, transition: leave },
};

// ---------- lists ----------

/** Parent of a staggered list. Children use `staggerItem`. */
export const staggerContainer: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.04, delayChildren: 0.02 } },
};

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: enter() },
  exit: { opacity: 0, transition: leave },
};

/**
 * Stagger only the first few items: with long lists, item 30 shouldn't wait
 * over a second to appear. Use as `custom={index}` with this variant.
 */
export const MAX_STAGGERED = 8;
export const staggerItemCapped: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: (index: number) => ({
    opacity: 1,
    y: 0,
    transition: { ...enter(), delay: Math.min(index, MAX_STAGGERED) * 0.04 },
  }),
};

// ---------- micro-interactions ----------

/** Buttons: press down slightly. */
export const tapScale = { scale: 0.97 } as const;

/** Cards: lift on hover. */
export const hoverLift = { y: -2 } as const;
