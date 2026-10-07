"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { cn } from "@/lib/utils";
import { useI18n } from "@/hooks/use-i18n";

interface DeleteReviewButtonProps {
  /** Runs after the user confirms. The caller does the (optimistic) delete. */
  onConfirm: () => void;
  disabled?: boolean;
  className?: string;
}

/** Small delete button with a confirmation modal, for the user's own review. */
export function DeleteReviewButton({ onConfirm, disabled = false, className }: DeleteReviewButtonProps) {
  const [open, setOpen] = useState(false);
  const { t } = useI18n();

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={disabled}
        onClick={() => setOpen(true)}
        className={cn("h-8 px-2 text-muted-foreground hover:text-destructive", className)}
      >
        <Trash2 aria-hidden="true" />
        {t.common.delete}
      </Button>
      <ConfirmModal
        open={open}
        onOpenChange={setOpen}
        variant="destructive"
        title={t.reviews.deleteTitle}
        description={t.reviews.deleteDescription}
        confirmLabel={t.restroom.deleteConfirm}
        cancelLabel={t.restroom.deleteCancel}
        onConfirm={onConfirm}
      />
    </>
  );
}
