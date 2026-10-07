"use client";

import { useEffect, useRef } from "react";

import { ToastAction } from "@/components/ui/toast";
import { useI18n } from "@/hooks/use-i18n";
import { useToast } from "@/hooks/use-toast";

/** Shows a destructive toast (with an optional retry action) whenever `error` becomes non-null. */
export function useErrorToast(error: string | null, title: string, onRetry?: () => void) {
  const { toast } = useToast();
  const { t } = useI18n();
  // Latest text in a ref: switching language shouldn't show the toast again
  const text = useRef({ title, t });
  text.current = { title, t };

  useEffect(() => {
    if (!error) return;
    const { title: currentTitle, t: current } = text.current;
    toast({
      variant: "destructive",
      title: currentTitle,
      description: current.list.checkInternet,
      action: onRetry ? (
        <ToastAction altText={current.common.retry} onClick={onRetry}>
          {current.common.retry}
        </ToastAction>
      ) : undefined,
    });
  }, [error, onRetry, toast]);
}
