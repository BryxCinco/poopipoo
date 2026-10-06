"use client";

import { Trash2 } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface DeleteReviewButtonProps {
  /** Runs after the user confirms. The caller does the (optimistic) delete. */
  onConfirm: () => void;
  disabled?: boolean;
  className?: string;
}

/** Small delete button with a confirmation dialog, for the user's own review. */
export function DeleteReviewButton({ onConfirm, disabled = false, className }: DeleteReviewButtonProps) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={disabled}
          className={cn("h-8 px-2 text-muted-foreground hover:text-destructive", className)}
        >
          <Trash2 aria-hidden="true" />
          Burahin
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="w-[calc(100%-2rem)] rounded-lg">
        <AlertDialogHeader>
          <AlertDialogTitle>Burahin ang review mo?</AlertDialogTitle>
          <AlertDialogDescription>
            Mawawala ang rating at comment mo, at mababago ang rating ng CR.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Huwag</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className={buttonVariants({ variant: "destructive" })}>
            Burahin
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
