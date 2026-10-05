"use client";

import { useState } from "react";
import { Loader2, Trash2 } from "lucide-react";

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
import { useToast } from "@/hooks/use-toast";
import { removeRestroom } from "@/lib/restroom-store";
import { cn } from "@/lib/utils";
import type { Restroom } from "@/types/restroom";

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

/** Delete button with a confirmation dialog. Only the owner can delete (RLS). */
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

  const handleDelete = async () => {
    setDeleting(true);
    onDeleteStart?.();
    try {
      await removeRestroom(restroom.id);
      toast({ title: "Naburang CR.", description: restroom.name });
      onDeleted?.();
    } catch (error) {
      onDeleteError?.();
      toast({
        variant: "destructive",
        title: "Hindi mabura ang CR",
        description: error instanceof Error ? error.message : "Subukan ulit mamaya.",
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
    <AlertDialog>
      <AlertDialogTrigger asChild>
        {variant === "icon" ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={deleting}
            aria-label={`Burahin ang ${restroom.name}`}
            className={cn("shrink-0 text-muted-foreground hover:text-destructive", className)}
          >
            {icon}
          </Button>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="lg"
            disabled={deleting}
            className={cn("w-full text-destructive hover:text-destructive", className)}
          >
            {icon}
            {deleting ? "Binubura..." : "Burahin ang CR na ito"}
          </Button>
        )}
      </AlertDialogTrigger>
      <AlertDialogContent className="w-[calc(100%-2rem)] rounded-lg">
        <AlertDialogHeader>
          <AlertDialogTitle>Burahin ang CR?</AlertDialogTitle>
          <AlertDialogDescription>
            Mabubura ang &quot;{restroom.name}&quot; para sa lahat. Hindi na ito maibabalik.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Huwag</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => void handleDelete()}
            className={buttonVariants({ variant: "destructive" })}
          >
            Burahin
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
