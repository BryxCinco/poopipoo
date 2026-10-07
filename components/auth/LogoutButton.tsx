"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

import { AnimatedButton } from "@/components/ui/AnimatedButton";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { useI18n } from "@/hooks/use-i18n";
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
  const { t } = useI18n();

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setConfirmOpen(true);
  };

  const logout = async () => {
    setPending(true);
    const { error } = await createClient().auth.signOut();
    if (error) {
      setPending(false);
      toast({ variant: "destructive", title: t.auth.logout.failed, description: error.message });
      throw error; // keeps the modal open (and shakes it)
    }
    toast({ title: t.auth.logout.done, description: t.auth.logout.doneDescription });
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
        loadingText={t.auth.logout.pending}
        className="w-full"
      >
        <LogOut aria-hidden="true" />
        {t.auth.logout.button}
      </AnimatedButton>
      <ConfirmModal
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        icon={LogOut}
        title={t.auth.logout.confirmTitle}
        confirmLabel={t.auth.logout.confirm}
        cancelLabel={t.auth.logout.cancel}
        onConfirm={logout}
      />
    </form>
  );
}
