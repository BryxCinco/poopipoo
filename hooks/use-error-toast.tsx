"use client";

import { useEffect } from "react";

import { ToastAction } from "@/components/ui/toast";
import { useToast } from "@/hooks/use-toast";

/** Shows a destructive toast (with an optional retry action) whenever `error` becomes non-null. */
export function useErrorToast(error: string | null, title: string, onRetry?: () => void) {
  const { toast } = useToast();

  useEffect(() => {
    if (!error) return;
    toast({
      variant: "destructive",
      title,
      description: "I-check ang internet connection mo.",
      action: onRetry ? (
        <ToastAction altText="Subukan ulit" onClick={onRetry}>
          Subukan ulit
        </ToastAction>
      ) : undefined,
    });
  }, [error, title, onRetry, toast]);
}
