"use client";

import { useEffect, type ReactNode } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { AnimatePresence, motion, useAnimate } from "framer-motion";
import { X } from "lucide-react";

import { fadeIn, scaleIn } from "@/lib/animations";
import { cn } from "@/lib/utils";

/**
 * Base modal: Radix Dialog for behaviour (focus trap, Escape, scroll lock,
 * close on backdrop click, labelled by its title) + Framer Motion for the
 * look (backdrop blur/fade, content scale/fade, animated exit).
 *
 * The Radix parts are `forceMount`ed so AnimatePresence decides when they
 * unmount, which lets the exit animation play.
 */

export interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  /** Shown above the title (e.g. an icon in a circle) */
  icon?: ReactNode;
  /** "alertdialog" for confirmations that interrupt the user */
  role?: "dialog" | "alertdialog";
  /** false = Escape/backdrop don't close it (e.g. while saving) */
  dismissible?: boolean;
  /** Hide the X button (when the footer has its own buttons) */
  hideCloseButton?: boolean;
  /** Called when the modal opens, to focus a specific element instead of the first one */
  onOpenAutoFocus?: (event: Event) => void;
  /** Change this number to shake the modal (e.g. after a failed action) */
  shakeKey?: number;
  className?: string;
}

export function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  icon,
  role = "dialog",
  dismissible = true,
  hideCloseButton = false,
  onOpenAutoFocus,
  shakeKey = 0,
  className,
}: ModalProps) {
  // Error shake (300ms). Plain inner wrapper, so it doesn't fight the enter/exit animation.
  const [shakeScope, animate] = useAnimate<HTMLDivElement>();
  useEffect(() => {
    if (shakeKey > 0 && shakeScope.current) {
      void animate(shakeScope.current, { x: [0, -6, 6, -4, 4, 0] }, { duration: 0.3 });
    }
  }, [shakeKey, animate, shakeScope]);

  const block = (event: Event) => {
    if (!dismissible) event.preventDefault();
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && (
          <DialogPrimitive.Portal forceMount>
            <DialogPrimitive.Overlay asChild forceMount>
              <motion.div
                className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
                variants={fadeIn}
                initial="hidden"
                animate="visible"
                exit="exit"
              />
            </DialogPrimitive.Overlay>

            {/* Centering layer; clicks pass through to the overlay (= close) */}
            <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center p-4">
              <DialogPrimitive.Content
                asChild
                forceMount
                role={role}
                aria-modal="true"
                // No description → don't point aria-describedby at a missing element
                {...(description ? {} : { "aria-describedby": undefined })}
                onEscapeKeyDown={block}
                onPointerDownOutside={block}
                onInteractOutside={block}
                onOpenAutoFocus={onOpenAutoFocus}
              >
                <motion.div
                  className={cn(
                    "pointer-events-auto relative flex max-h-[85dvh] w-full max-w-sm flex-col gap-4 overflow-y-auto rounded-2xl border bg-card p-6 text-card-foreground shadow-xl focus:outline-none",
                    className
                  )}
                  variants={scaleIn}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                >
                  <div ref={shakeScope} className="flex flex-col gap-4">
                    <div className="flex flex-col items-center gap-3 text-center">
                      {icon}
                      <DialogPrimitive.Title className="text-lg font-semibold leading-tight">{title}</DialogPrimitive.Title>
                      {description && (
                        <DialogPrimitive.Description className="text-sm text-muted-foreground">
                          {description}
                        </DialogPrimitive.Description>
                      )}
                    </div>

                    {children}
                    {footer && <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">{footer}</div>}
                  </div>

                  {!hideCloseButton && dismissible && (
                    <DialogPrimitive.Close
                      className="absolute right-3 top-3 rounded-full p-1.5 text-muted-foreground transition-[color,background-color,transform] duration-150 hover:rotate-90 hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      aria-label="Isara"
                    >
                      <X className="h-4 w-4" aria-hidden="true" />
                    </DialogPrimitive.Close>
                  )}
                </motion.div>
              </DialogPrimitive.Content>
            </div>
          </DialogPrimitive.Portal>
        )}
      </AnimatePresence>
    </DialogPrimitive.Root>
  );
}
