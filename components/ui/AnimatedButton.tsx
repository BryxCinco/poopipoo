"use client";

import { forwardRef, type ReactNode } from "react";
import { motion, type HTMLMotionProps } from "framer-motion";
import { Loader2 } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { SPRING, tapScale } from "@/lib/animations";
import { cn } from "@/lib/utils";

/**
 * Button with Framer Motion micro-interactions: scale on tap, lift on hover
 * (solid variants), and a loading state with a spinner. Same look as the
 * shadcn Button (shares buttonVariants). Use it for main actions.
 */

const VARIANTS = {
  primary: "default",
  secondary: "secondary",
  ghost: "ghost",
  destructive: "destructive",
  outline: "outline",
} as const;

export type AnimatedButtonVariant = keyof typeof VARIANTS;

export interface AnimatedButtonProps extends Omit<HTMLMotionProps<"button">, "children"> {
  variant?: AnimatedButtonVariant;
  size?: "default" | "sm" | "lg" | "icon";
  /** Shows a spinner, disables the button, and sets aria-busy */
  loading?: boolean;
  /** Text shown while loading (defaults to the normal children) */
  loadingText?: ReactNode;
  children?: ReactNode;
}

export const AnimatedButton = forwardRef<HTMLButtonElement, AnimatedButtonProps>(
  (
    { variant = "primary", size = "default", loading = false, loadingText, disabled, className, children, ...props },
    ref
  ) => {
    const lifts = variant === "primary" || variant === "destructive";
    const inactive = disabled || loading;

    return (
      <motion.button
        ref={ref}
        // Framer controls transform here, so drop the CSS press/lift from buttonVariants
        className={cn(
          buttonVariants({ variant: VARIANTS[variant], size }),
          "active:scale-100 hover:translate-y-0",
          className
        )}
        disabled={inactive}
        aria-busy={loading || undefined}
        whileTap={inactive ? undefined : tapScale}
        whileHover={inactive || !lifts ? undefined : { y: -1 }}
        transition={SPRING}
        {...props}
      >
        {loading && <Loader2 className="animate-spin" aria-hidden="true" />}
        {loading && loadingText ? loadingText : children}
      </motion.button>
    );
  }
);
AnimatedButton.displayName = "AnimatedButton";
