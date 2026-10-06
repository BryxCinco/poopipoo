"use client"

import { useToast } from "@/hooks/use-toast"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"

// Toasts close on their own after this long (Radix pauses the timer on hover/focus)
const TOAST_DURATION_MS = 5000

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider duration={TOAST_DURATION_MS}>
      {toasts.map(function ({ id, title, description, action, duration, ...props }) {
        const ms = duration ?? TOAST_DURATION_MS
        return (
          <Toast key={id} duration={ms} {...props}>
            <div className="grid gap-1">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && (
                <ToastDescription>{description}</ToastDescription>
              )}
            </div>
            {action}
            <ToastClose />
            {/* Time left before auto-dismiss; pauses with the timer on hover/focus */}
            {Number.isFinite(ms) && <span
              aria-hidden="true"
              className="absolute inset-x-0 bottom-0 h-1 origin-left animate-toast-progress bg-current opacity-25 group-focus-within:[animation-play-state:paused] group-hover:[animation-play-state:paused]"
              style={{ animationDuration: `${ms}ms` }}
            />}
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}
