"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useAuthUser } from "@/hooks/use-auth-user";
import { useI18n } from "@/hooks/use-i18n";
import { useToast } from "@/hooks/use-toast";
import { isDemoUser } from "@/lib/auth/demo";

/**
 * "Try demo" on the login/signup pages: signs in to the shared demo account
 * (POST /api/auth/demo), no sign up needed. Hidden for the demo account itself.
 * The pages only render it when demo mode is set up (DEMO_USER_ID).
 */
export function TryDemoButton({ returnUrl }: { returnUrl: string }) {
  const router = useRouter();
  const { user } = useAuthUser();
  const { toast } = useToast();
  const { t } = useI18n();
  const [pending, setPending] = useState(false);

  if (isDemoUser(user)) return null;

  const start = async () => {
    setPending(true);
    try {
      const response = await fetch("/api/auth/demo", { method: "POST" });
      if (!response.ok) throw new Error(`demo login failed (${response.status})`);
      router.replace(returnUrl);
      // Server Components re-render with the new session
      router.refresh();
    } catch {
      setPending(false);
      toast({ variant: "destructive", title: t.demo.failed });
    }
  };

  return (
    <div className="mt-4 flex flex-col gap-2">
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" aria-hidden="true" />
        {t.demo.or}
        <span className="h-px flex-1 bg-border" aria-hidden="true" />
      </div>
      <Button type="button" variant="outline" size="lg" className="w-full" disabled={pending} onClick={() => void start()}>
        {pending ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Sparkles aria-hidden="true" />}
        {pending ? t.demo.starting : t.demo.tryDemo}
      </Button>
      <p className="text-center text-xs text-muted-foreground">{t.demo.hint}</p>
    </div>
  );
}
