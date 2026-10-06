"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { cn } from "@/lib/utils";

interface DeleteReviewButtonProps {
  /** Runs after the user confirms. The caller does the (optimistic) delete. */
  onConfirm: () => void;
  disabled?: boolean;
  className?: string;
}

/** Small delete button with a confirmation modal, for the user's own review. */
export function DeleteReviewButton({ onConfirm, disabled = false, className }: DeleteReviewButtonProps) {
  const [open, setOpen] = useState(false);

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
        Burahin
      </Button>
      <ConfirmModal
        open={open}
        onOpenChange={setOpen}
        variant="destructive"
        title="Burahin ang review na ito?"
        description="Mawawala ang rating at comment mo, at mababago ang rating ng CR."
        confirmLabel="Burahin"
        cancelLabel="Huwag"
        onConfirm={onConfirm}
      />
    </>
  );
}
