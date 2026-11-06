"use client";

import { AlertTriangle, Ban, Check, Clock, Map as MapIcon, ShieldCheck, type LucideIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/hooks/use-i18n";
import { approvalKind, type ApprovalKind } from "@/lib/moderation/approval";
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

// Approved without confirmations gets a plain look: only the community can make it "Verified"
const APPROVED_STYLES: Record<ApprovalKind, { icon: LucideIcon; className: string }> = {
  community: STYLES.approved,
  osm: { icon: MapIcon, className: "bg-muted text-foreground/80 hover:bg-muted" },
  approved: { icon: Check, className: "bg-muted text-foreground/80 hover:bg-muted" },
};

/** Moderation status of a restroom. Approved reads as Verified by community / OSM Import / Approved. */
export function RestroomStatusBadge({
  status,
  verifiedCount,
  source,
  className,
}: {
  status: RestroomStatus;
  verifiedCount?: number | null;
  source?: string | null;
  className?: string;
}) {
  const { t } = useI18n();
  const kind = approvalKind(verifiedCount, source);
  const { icon: Icon, className: tone } = status === "approved" ? APPROVED_STYLES[kind] : STYLES[status];
  return (
    <Badge className={cn("w-fit gap-1 border-transparent font-medium", tone, className)}>
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {status === "approved" ? t.moderation.approval[kind].label : t.moderation.status[status]}
    </Badge>
  );
}
