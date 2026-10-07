"use client";

import { useState } from "react";
import { CheckCircle, Loader2, Undo2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useI18n } from "@/hooks/use-i18n";
import { useToast } from "@/hooks/use-toast";
import { format, plural } from "@/lib/i18n/format";
import { invalidateRestrooms } from "@/lib/restroom-store";
import { cn } from "@/lib/utils";
import type { RestroomStatus } from "@/types/restroom";

/** Votes needed to approve a pending restroom (matches 0005_moderation.sql). */
export const VERIFICATIONS_NEEDED = 5;

interface VerifyButtonProps {
  restroomId: string;
  status: RestroomStatus;
  verifiedCount: number;
  /** The viewer already confirmed it */
  initialVerified: boolean;
  /** Signed-in user's id; null for guests */
  viewerId: string | null;
  /** The viewer added this restroom (can't confirm their own) */
  isOwner: boolean;
  /** New count/status from the server after a vote */
  onChange: (next: { verifiedCount: number; status: RestroomStatus }) => void;
}

function isStatus(value: unknown): value is RestroomStatus {
  return value === "pending" || value === "approved" || value === "flagged" || value === "rejected";
}

/**
 * "Nakita ko na ito" — community confirmation that a restroom is real.
 * Shows the count (and progress while pending). POST /api/verify.
 */
export function VerifyButton({
  restroomId,
  status,
  verifiedCount,
  initialVerified,
  viewerId,
  isOwner,
  onChange,
}: VerifyButtonProps) {
  const { t } = useI18n();
  const tv = t.moderation.verify;
  const { toast } = useToast();
  const [verified, setVerified] = useState(initialVerified);
  const [pending, setPending] = useState(false);

  const vote = async (action: "verify" | "unverify") => {
    if (!viewerId) {
      toast({ title: tv.loginTitle, description: tv.loginDescription });
      return;
    }
    setPending(true);
    try {
      const response = await fetch("/api/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restroom_id: restroomId, action }),
      });
      const body: unknown = await response.json().catch(() => null);
      const data = typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};

      if (!response.ok) {
        const message = typeof data.error === "string" ? data.error : t.common.unknownError;
        toast({ variant: "destructive", title: tv.failed, description: message });
        return;
      }

      const nextCount = typeof data.verified_count === "number" ? data.verified_count : verifiedCount;
      const nextStatus = isStatus(data.status) ? data.status : status;
      setVerified(action === "verify");
      onChange({ verifiedCount: nextCount, status: nextStatus });
      invalidateRestrooms(); // map/list show the new status on their next visit
      toast({
        title:
          action === "unverify"
            ? tv.removed
            : nextStatus === "approved" && status !== "approved"
              ? tv.approved
              : tv.success,
      });
    } catch {
      toast({ variant: "destructive", title: tv.failed, description: t.common.tryAgainLater });
    } finally {
      setPending(false);
    }
  };

  const countText = plural(tv.count, verifiedCount);
  const progressText =
    status === "pending"
      ? format(tv.progress, { count: Math.min(verifiedCount, VERIFICATIONS_NEEDED), needed: VERIFICATIONS_NEEDED })
      : null;

  return (
    <div className="flex flex-col gap-2">
      {status === "pending" && (
        <div
          className="h-1.5 overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-label={progressText ?? countText}
          aria-valuemin={0}
          aria-valuemax={VERIFICATIONS_NEEDED}
          aria-valuenow={Math.min(verifiedCount, VERIFICATIONS_NEEDED)}
        >
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-300 ease-out"
            style={{ width: `${(Math.min(verifiedCount, VERIFICATIONS_NEEDED) / VERIFICATIONS_NEEDED) * 100}%` }}
          />
        </div>
      )}
      <p className="text-xs text-muted-foreground" aria-live="polite">
        {countText}
        {progressText && <> · {progressText}</>}
      </p>

      {isOwner ? (
        <p className="text-sm text-muted-foreground">{tv.own}</p>
      ) : status === "rejected" ? null : verified ? (
        <div className="flex gap-2">
          <Button type="button" variant="secondary" disabled className="flex-1 disabled:opacity-100">
            <CheckCircle className="text-primary" aria-hidden="true" />
            {tv.done}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => void vote("unverify")}
            disabled={pending}
            aria-label={tv.undoLabel}
          >
            {pending ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Undo2 aria-hidden="true" />}
            {tv.undo}
          </Button>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          onClick={() => void vote("verify")}
          disabled={pending}
          className={cn("w-full")}
        >
          {pending ? <Loader2 className="animate-spin" aria-hidden="true" /> : <CheckCircle aria-hidden="true" />}
          {tv.button}
        </Button>
      )}
    </div>
  );
}
