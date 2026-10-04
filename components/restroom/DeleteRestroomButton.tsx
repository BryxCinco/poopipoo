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
import { useRestrooms } from "@/hooks/use-restrooms";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { Restroom } from "@/types/restroom";

interface DeleteRestroomButtonProps {
  restroom: Restroom;
  /** "icon" for compact list rows, "full" for a labeled button. */
  variant?: "icon" | "full";
  /** Runs after deleting (e.g. navigate away from the deleted restroom's page). */
  onDeleted?: () => void;
  className?: string;
}

/** Delete button with a confirmation dialog. Only for user-added restrooms. */
export function DeleteRestroomButton({
  restroom,
  variant = "icon",
  onDeleted,
  className,
}: DeleteRestroomButtonProps) {
  const { removeRestroom } = useRestrooms();
  const { toast } = useToast();

  const handleDelete = () => {
    removeRestroom(restroom.id);
    toast({ title: "Naburang CR.", description: restroom.name });
    onDeleted?.();
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        {variant === "icon" ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={`Burahin ang ${restroom.name}`}
            className={cn("shrink-0 text-muted-foreground hover:text-destructive", className)}
          >
            <Trash2 aria-hidden="true" />
          </Button>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="lg"
            className={cn("w-full text-destructive hover:text-destructive", className)}
          >
            <Trash2 aria-hidden="true" />
            Burahin ang CR na ito
          </Button>
        )}
      </AlertDialogTrigger>
      <AlertDialogContent className="w-[calc(100%-2rem)] rounded-lg">
        <AlertDialogHeader>
          <AlertDialogTitle>Burahin ang CR?</AlertDialogTitle>
          <AlertDialogDescription>
            Mabubura ang &quot;{restroom.name}&quot; sa device na ito. Hindi na ito maibabalik.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Huwag</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            className={buttonVariants({ variant: "destructive" })}
          >
            Burahin
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
