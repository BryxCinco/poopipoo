"use client";

import { useEffect, useState } from "react";
import { Check, Share2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useI18n } from "@/hooks/use-i18n";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

/** Copies the current page URL to the clipboard. */
export function ShareButton({ className }: { className?: string }) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const { t } = useI18n();

  // Reset the "copied" checkmark after a moment.
  useEffect(() => {
    if (!copied) return;
    const timeout = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timeout);
  }, [copied]);

  const handleShare = async () => {
    try {
      // Clipboard API only exists on secure origins (HTTPS or localhost).
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      toast({ title: t.restroom.linkCopied, description: t.restroom.linkCopiedDescription });
    } catch {
      toast({
        variant: "destructive",
        title: t.restroom.copyFailed,
        description: t.restroom.copyFailedDescription,
      });
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="lg"
      onClick={handleShare}
      className={cn("w-full", className)}
    >
      {copied ? <Check aria-hidden="true" /> : <Share2 aria-hidden="true" />}
      {copied ? t.restroom.copied : t.restroom.share}
    </Button>
  );
}
