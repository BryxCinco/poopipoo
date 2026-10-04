"use client";

import { useEffect, useState } from "react";
import { Check, Share2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

/** Copies the current page URL to the clipboard. */
export function ShareButton({ className }: { className?: string }) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

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
      toast({ title: "Na-copy ang link", description: "I-paste para i-share ang CR na ito." });
    } catch {
      toast({
        variant: "destructive",
        title: "Hindi ma-copy ang link",
        description: "I-copy na lang mula sa address bar.",
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
      {copied ? "Na-copy!" : "Share"}
    </Button>
  );
}
