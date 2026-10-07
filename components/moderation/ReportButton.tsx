"use client";

import { useId, useState, type FormEvent } from "react";
import { Flag, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/Modal";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/hooks/use-i18n";
import { useToast } from "@/hooks/use-toast";
import { format } from "@/lib/i18n/format";
import { cn } from "@/lib/utils";
import type { ReportReason } from "@/types/database";

const REASONS: ReportReason[] = ["fake", "inappropriate", "spam", "duplicate", "other"];
const DETAILS_MAX = 500;

interface ReportButtonProps {
  targetType: "restroom" | "review";
  targetId: string;
  /** Review author's name, for the button's accessible name */
  authorName?: string;
  /** Signed-in user's id; null for guests (they're asked to log in) */
  viewerId: string | null;
  /** "full" = text button (restroom page), "icon" = small icon button (reviews) */
  variant?: "full" | "icon";
  className?: string;
}

/**
 * Flag button + report modal (reason + optional details) → POST /api/report.
 * The server and database do the counting and hiding (see the route).
 */
export function ReportButton({ targetType, targetId, authorName, viewerId, variant = "full", className }: ReportButtonProps) {
  const { t } = useI18n();
  const tr = t.moderation.report;
  const { toast } = useToast();
  const id = useId();

  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ReportReason>("fake");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [shakeKey, setShakeKey] = useState(0);

  const label =
    targetType === "restroom" ? tr.restroomButton : format(tr.reviewButton, { name: authorName ?? t.common.user });

  const handleOpen = () => {
    if (!viewerId) {
      toast({ title: tr.loginTitle, description: tr.loginDescription });
      return;
    }
    setOpen(true);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      const response = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target_type: targetType,
          target_id: targetId,
          reason,
          details: details.trim() || undefined,
        }),
      });
      const body: unknown = await response.json().catch(() => null);
      const message =
        typeof body === "object" && body !== null && "error" in body && typeof body.error === "string"
          ? body.error
          : t.common.unknownError;
      const code = typeof body === "object" && body !== null && "code" in body ? body.code : null;

      if (response.ok) {
        toast({ title: tr.success });
      } else if (code === "already_reported") {
        // Not an error from the user's point of view
        toast({ title: tr.already });
      } else {
        setShakeKey((key) => key + 1);
        toast({ variant: "destructive", title: tr.failed, description: message });
        return;
      }
      setOpen(false);
      setDetails("");
      setReason("fake");
    } catch {
      setShakeKey((key) => key + 1);
      toast({ variant: "destructive", title: tr.failed, description: t.common.tryAgainLater });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {variant === "icon" ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={handleOpen}
          aria-label={label}
          title={label}
          className={cn("h-8 w-8 text-muted-foreground hover:text-destructive", className)}
        >
          <Flag className="h-3.5 w-3.5" aria-hidden="true" />
        </Button>
      ) : (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleOpen}
          className={cn("text-muted-foreground hover:text-destructive", className)}
        >
          <Flag aria-hidden="true" />
          {label}
        </Button>
      )}

      <Modal
        open={open}
        onOpenChange={(next) => !submitting && setOpen(next)}
        title={targetType === "restroom" ? tr.restroomTitle : tr.reviewTitle}
        description={tr.description}
        icon={
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <Flag className="h-6 w-6" aria-hidden="true" />
          </span>
        }
        dismissible={!submitting}
        shakeKey={shakeKey}
      >
        <form onSubmit={(event) => void handleSubmit(event)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${id}-reason`}>{tr.reasonLabel}</Label>
            <select
              id={`${id}-reason`}
              value={reason}
              onChange={(event) => setReason(REASONS.find((value) => value === event.target.value) ?? "other")}
              disabled={submitting}
              className="h-11 w-full rounded-md border border-input bg-background px-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60 md:text-sm"
            >
              {REASONS.map((value) => (
                <option key={value} value={value}>
                  {tr.reasons[value]}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${id}-details`}>
              {tr.detailsLabel} <span className="font-normal text-muted-foreground">{tr.optional}</span>
            </Label>
            <Textarea
              id={`${id}-details`}
              value={details}
              onChange={(event) => setDetails(event.target.value.slice(0, DETAILS_MAX))}
              placeholder={tr.detailsPlaceholder}
              maxLength={DETAILS_MAX}
              rows={3}
              disabled={submitting}
              aria-describedby={`${id}-count`}
            />
            <p id={`${id}-count`} className="text-right text-xs text-muted-foreground tabular-nums">
              {details.length}/{DETAILS_MAX}
            </p>
          </div>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
              {t.common.cancel}
            </Button>
            <Button type="submit" variant="destructive" disabled={submitting}>
              {submitting ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Flag aria-hidden="true" />}
              {submitting ? tr.submitting : tr.submit}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
