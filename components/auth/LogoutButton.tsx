"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

import { AnimatedButton } from "@/components/ui/AnimatedButton";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { useToast } from "@/hooks/use-toast";
import { createClient } from "@/lib/supabase/client";

/**
 * Posts to /auth/logout (works without JavaScript). With JavaScript, asks for
 * confirmation first, then signs out in the browser so we can show a toast
 * and stay in the app.
 */
export function LogoutButton() {
  const router = useRouter();
  const { toast } = useToast();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, setPending] = useState(false);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setConfirmOpen(true);
  };

  const logout = async () => {
    setPending(true);
    const { error } = await createClient().auth.signOut();
    if (error) {
      setPending(false);
      toast({ variant: "destructive", title: "Hindi maka-logout", description: error.message });
      throw error; // keeps the modal open (and shakes it)
    }
    toast({ title: "Naka-logout ka na.", description: "Hanggang sa susunod!" });
    router.replace("/");
    router.refresh();
  };

  return (
    <form action="/auth/logout" method="post" onSubmit={handleSubmit}>
      <AnimatedButton
        type="submit"
        variant="outline"
        size="lg"
        loading={pending}
        loadingText="Nagla-logout..."
        className="w-full"
      >
        <LogOut aria-hidden="true" />
        Mag-logout
      </AnimatedButton>
      <ConfirmModal
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        icon={LogOut}
        title="Sigurado ka bang gusto mong mag-logout?"
        confirmLabel="Oo, mag-logout"
        cancelLabel="Hindi"
        onConfirm={logout}
      />
    </form>
  );
}
