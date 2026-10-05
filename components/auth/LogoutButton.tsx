"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Loader2, LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { createClient } from "@/lib/supabase/client";

/**
 * Posts to /auth/logout (works without JavaScript). With JavaScript, signs out
 * in the browser instead so we can show a toast and stay in the app.
 */
export function LogoutButton() {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, setPending] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPending(true);
    const { error } = await createClient().auth.signOut();
    if (error) {
      setPending(false);
      toast({ variant: "destructive", title: "Hindi maka-logout", description: error.message });
      return;
    }
    toast({ title: "Naka-logout ka na.", description: "Hanggang sa susunod!" });
    router.replace("/");
    router.refresh();
  };

  return (
    <form action="/auth/logout" method="post" onSubmit={(e) => void handleSubmit(e)}>
      <Button type="submit" variant="outline" size="lg" disabled={pending} className="w-full">
        {pending ? <Loader2 className="animate-spin" aria-hidden="true" /> : <LogOut aria-hidden="true" />}
        {pending ? "Nagla-logout..." : "Mag-logout"}
      </Button>
    </form>
  );
}
