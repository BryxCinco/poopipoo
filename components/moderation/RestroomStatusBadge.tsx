"use client";

import { AlertTriangle, Ban, Clock, ShieldCheck, type LucideIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/hooks/use-i18n";
import { cn } from "@/lib/utils";
import type { RestroomStatus } from "@/types/restroom";

const STYLES: Record<RestroomStatus, { icon: LucideIcon; className: string }> = {
  pending: { icon: Clock, className: "bg-muted text-foreground/80 hover:bg-muted" },
  approved: { icon: ShieldCheck, className: "bg-primary/10 text-primary hover:bg-primary/10" },
  flagged: {
    icon: AlertTriangle,
    className: "bg-amber-500/15 text-amber-800 hover:bg-amber-500/15 dark:text-amber-300",
  },
  rejected: { icon: Ban, className: "bg-destructive/10 text-destructive hover:bg-destructive/10" },
};

/** Moderation status of a restroom: Hindi pa verified / Verified / Sinusuri / Tinanggihan. */
export function RestroomStatusBadge({ status, className }: { status: RestroomStatus; className?: string }) {
  const { t } = useI18n();
  const { icon: Icon, className: tone } = STYLES[status];
  return (
    <Badge className={cn("w-fit gap-1 border-transparent font-medium", tone, className)}>
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {t.moderation.status[status]}
    </Badge>
  );
}
