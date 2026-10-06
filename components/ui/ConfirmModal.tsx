"use client";

import { useRef, useState, type ReactNode } from "react";
import { AlertTriangle, HelpCircle, type LucideIcon } from "lucide-react";

import { AnimatedButton } from "@/components/ui/AnimatedButton";
import { Modal } from "@/components/ui/Modal";
import { cn } from "@/lib/utils";

/**
 * Confirmation modal: title, description, confirm + cancel.
 *
 * - `onConfirm` may return a Promise: the confirm button shows a spinner and
 *   the modal can't be dismissed until it settles. It closes on success; on
 *   failure it stays open and shakes (the caller shows the error message).
 * - Omit `cancelLabel` for a single-button notice (e.g. "Okay").
 * - Destructive modals focus Cancel first, so Enter doesn't delete by accident.
 */
export interface ConfirmModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  variant?: "default" | "destructive";
  icon?: LucideIcon;
  onConfirm: () => void | Promise<void>;
  /** Extra loading control from the caller (in addition to the Promise) */
  loading?: boolean;
}

export function ConfirmModal({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel,
  variant = "default",
  icon,
  onConfirm,
  loading = false,
}: ConfirmModalProps) {
  const [pending, setPending] = useState(false);
  const [shakeKey, setShakeKey] = useState(0);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const busy = pending || loading;
  const destructive = variant === "destructive";
  const Icon = icon ?? (destructive ? AlertTriangle : HelpCircle);

  const handleConfirm = async () => {
    setPending(true);
    try {
      await onConfirm();
      onOpenChange(false);
    } catch {
      setShakeKey((key) => key + 1); // shakes the modal
    } finally {
      setPending(false);
    }
  };

  return (
    <Modal
      open={open}
      onOpenChange={(next) => {
        if (!busy) onOpenChange(next);
      }}
      role="alertdialog"
      dismissible={!busy}
      hideCloseButton
      onOpenAutoFocus={(event) => {
        if (destructive && cancelRef.current) {
          event.preventDefault();
          cancelRef.current.focus();
        }
      }}
      shakeKey={shakeKey}
      icon={
        <span
          className={cn(
            "flex h-12 w-12 items-center justify-center rounded-full",
            destructive ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"
          )}
        >
          <Icon className="h-6 w-6" aria-hidden="true" />
        </span>
      }
      title={title}
      description={description}
      footer={
        <>
          {cancelLabel && (
            <AnimatedButton
              ref={cancelRef}
              type="button"
              variant="outline"
              size="lg"
              disabled={busy}
              onClick={() => onOpenChange(false)}
              className="w-full sm:w-auto"
            >
              {cancelLabel}
            </AnimatedButton>
          )}
          <AnimatedButton
            type="button"
            variant={destructive ? "destructive" : "primary"}
            size="lg"
            loading={busy}
            onClick={() => void handleConfirm()}
            className="w-full sm:w-auto"
          >
            {confirmLabel}
          </AnimatedButton>
        </>
      }
    />
  );
}
