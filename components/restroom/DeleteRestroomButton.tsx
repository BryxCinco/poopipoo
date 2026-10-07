"use client";

import { useState } from "react";
import { Loader2, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { useToast } from "@/hooks/use-toast";
import { removeRestroom } from "@/lib/restroom-store";
import { cn } from "@/lib/utils";
import type { Restroom } from "@/types/restroom";
import { useI18n } from "@/hooks/use-i18n";
import { errorText } from "@/lib/i18n/errors";
import { format } from "@/lib/i18n/format";

interface DeleteRestroomButtonProps {
  restroom: Pick<Restroom, "id" | "name">;
  /** "icon" for compact list rows, "full" for a labeled button. */
  variant?: "icon" | "full";
  /** Called right after confirming, before the server answers (optimistic UI). */
  onDeleteStart?: () => void;
  /** Called after the server confirmed the delete. */
  onDeleted?: () => void;
  /** Called if the delete failed, so optimistic UI can be undone. */
  onDeleteError?: () => void;
  className?: string;
}

/** Delete button with a confirmation modal. Only the owner can delete (RLS). */
export function DeleteRestroomButton({
  restroom,
  variant = "icon",
  onDeleteStart,
  onDeleted,
  onDeleteError,
  className,
}: DeleteRestroomButtonProps) {
  const { toast } = useToast();
  const [deleting, setDeleting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const { t } = useI18n();

  const handleDelete = async () => {
    setDeleting(true);
    onDeleteStart?.();
    try {
      await removeRestroom(restroom.id);
      toast({ title: t.restroom.deleted, description: restroom.name });
      onDeleted?.();
    } catch (error) {
      onDeleteError?.();
      toast({
        variant: "destructive",
        title: t.restroom.deleteFailed,
        description: errorText(error, t),
      });
    } finally {
      setDeleting(false);
    }
  };

  const icon = deleting ? (
    <Loader2 className="animate-spin" aria-hidden="true" />
  ) : (
    <Trash2 aria-hidden="true" />
  );

  return (
    <>
      {variant === "icon" ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled={deleting}
          onClick={() => setConfirmOpen(true)}
          aria-label={format(t.restroom.deleteLabel, { name: restroom.name })}
          className={cn("shrink-0 text-muted-foreground hover:text-destructive [&_svg]:transition-transform hover:[&_svg]:scale-110", className)}
        >
          {icon}
        </Button>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="lg"
          disabled={deleting}
          onClick={() => setConfirmOpen(true)}
          className={cn("w-full text-destructive hover:text-destructive", className)}
        >
          {icon}
          {deleting ? t.restroom.deleting : t.restroom.deleteThis}
        </Button>
      )}
      <ConfirmModal
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        variant="destructive"
        title={t.restroom.deleteTitle}
        description={format(t.restroom.deleteDescription, { name: restroom.name })}
        confirmLabel={t.restroom.deleteConfirm}
        cancelLabel={t.restroom.deleteCancel}
        // Waits for the server so the modal shows a spinner; errors are toasted in handleDelete
        onConfirm={handleDelete}
      />
    </>
  );
}
