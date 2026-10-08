"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { UserX } from "lucide-react";

import { AnimatedButton } from "@/components/ui/AnimatedButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/Modal";
import { useI18n } from "@/hooks/use-i18n";
import { useToast } from "@/hooks/use-toast";
import { format } from "@/lib/i18n/format";

/**
 * "Delete account" button + confirmation modal. The user must type their
 * username before the delete button works; the API checks it again.
 * Calls POST /api/account/delete, then goes home as a guest.
 */
export function DeleteAccountButton({ username }: { username: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useI18n();
  const td = t.settings.deleteAccountFlow;

  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shakeKey, setShakeKey] = useState(0);

  const matches = typed.trim().toLowerCase() === username.trim().toLowerCase();

  const close = (next: boolean) => {
    if (pending) return;
    setOpen(next);
    if (!next) {
      setTyped("");
      setError(null);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!matches) {
      setError(td.mismatch);
      setShakeKey((key) => key + 1);
      return;
    }
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/account/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: typed.trim() }),
      });
      if (!response.ok) {
        const body: unknown = await response.json().catch(() => null);
        const message =
          typeof body === "object" && body !== null && "error" in body && typeof body.error === "string"
            ? body.error
            : td.failed;
        throw new Error(message);
      }
      toast({ title: td.done, description: td.doneDescription });
      setOpen(false);
      router.replace("/");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : td.failed);
      setShakeKey((key) => key + 1);
    } finally {
      setPending(false);
    }
  };

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        onClick={() => setOpen(true)}
        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
      >
        <UserX aria-hidden="true" />
        {t.settings.deleteAccount}
      </Button>

      <Modal
        open={open}
        onOpenChange={close}
        role="alertdialog"
        dismissible={!pending}
        hideCloseButton
        shakeKey={shakeKey}
        // Focus the text field first, never the delete button
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          document.getElementById("delete-account-confirm")?.focus();
        }}
        icon={
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <UserX className="h-6 w-6" aria-hidden="true" />
          </span>
        }
        title={t.settings.deleteTitle}
        description={t.settings.deleteDescription}
        footer={
          <>
            <AnimatedButton
              type="button"
              variant="outline"
              size="lg"
              disabled={pending}
              onClick={() => close(false)}
              className="w-full sm:w-auto"
            >
              {td.cancel}
            </AnimatedButton>
            {/* Outside the <form>, linked to it with form="..." */}
            <AnimatedButton
              type="submit"
              form="delete-account-form"
              variant="destructive"
              size="lg"
              loading={pending}
              disabled={!matches}
              className="w-full sm:w-auto"
            >
              {td.confirm}
            </AnimatedButton>
          </>
        }
      >
        <form id="delete-account-form" onSubmit={(event) => void handleSubmit(event)} className="flex flex-col gap-1.5" noValidate>
          <Label htmlFor="delete-account-confirm">{td.confirmLabel}</Label>
          <Input
            id="delete-account-confirm"
            value={typed}
            onChange={(event) => {
              setTyped(event.target.value);
              setError(null);
            }}
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            disabled={pending}
            aria-invalid={error !== null}
            aria-describedby={error ? "delete-account-error" : "delete-account-hint"}
          />
          {error ? (
            <p id="delete-account-error" role="alert" className="text-xs font-medium text-destructive">
              {error}
            </p>
          ) : (
            <p id="delete-account-hint" className="text-xs text-muted-foreground">
              {format(td.confirmHint, { username })}
            </p>
          )}
        </form>
      </Modal>
    </>
  );
}
