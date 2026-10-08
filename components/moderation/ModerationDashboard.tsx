"use client";

import { useId, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Ban,
  Bot,
  Check,
  ExternalLink,
  Flag,
  Loader2,
  ShieldCheck,
  Sparkles,
  UserCheck,
  X,
} from "lucide-react";

import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/Modal";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/hooks/use-i18n";
import { useToast } from "@/hooks/use-toast";
import { errorText } from "@/lib/i18n/errors";
import { format, plural } from "@/lib/i18n/format";
import { toAppError } from "@/lib/moderation/errors";
import { formatRelativeTime } from "@/lib/relative-time";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { ReportReason, RestroomStatus, ReviewStatus } from "@/types/database";

// ---------- data passed from app/moderation/page.tsx ----------

export interface FlaggedRestroomItem {
  id: string;
  name: string;
  address: string;
  flagCount: number;
  /** null unless the AI flagged it */
  aiReason: string | null;
  authorId: string | null;
  authorName: string | null;
  createdAt: string;
}

export interface ReportedItem {
  targetType: "restroom" | "review";
  targetId: string;
  /** Restroom name (for a review: the restroom it's about); null = deleted */
  title: string | null;
  /** Review comment, or the restroom's address */
  excerpt: string | null;
  restroomId: string | null;
  authorId: string | null;
  authorName: string | null;
  status: RestroomStatus | ReviewStatus | null;
  reports: {
    id: string;
    reporterName: string | null;
    reason: ReportReason;
    details: string | null;
    createdAt: string;
  }[];
}

export interface BannedUserItem {
  id: string;
  username: string | null;
  reason: string | null;
  bannedAt: string | null;
}

export interface UncheckedRestroomItem {
  id: string;
  name: string;
  address: string;
  authorName: string | null;
  createdAt: string;
}

interface ModerationDashboardProps {
  viewerId: string;
  flagged: FlaggedRestroomItem[];
  reported: ReportedItem[];
  banned: BannedUserItem[];
  unchecked: UncheckedRestroomItem[];
}

type SectionId = "flagged" | "reports" | "banned" | "unchecked";

/**
 * Lists flagged restrooms, reported items, banned users and restrooms the AI
 * hasn't checked, with approve / reject / ban / unban / AI-check actions.
 * Handled items disappear right away; router.refresh() reloads the lists.
 */
export function ModerationDashboard({ viewerId, flagged, reported, banned, unchecked }: ModerationDashboardProps) {
  const { t, locale } = useI18n();
  const td = t.moderation.dashboard;
  const router = useRouter();
  const { toast } = useToast();

  // Items handled in this session (hidden until the refresh drops them)
  const [done, setDone] = useState<ReadonlySet<string>>(new Set());
  // Which action is running, e.g. "approve:restroom:<id>"
  const [busy, setBusy] = useState<string | null>(null);
  const [banTarget, setBanTarget] = useState<{ id: string; name: string } | null>(null);

  const markDone = (key: string) => setDone((prev) => new Set(prev).add(key));
  const userName = (name: string | null) => name ?? td.unknownUser;

  /** Runs an action; on success hides the item and refreshes the server data. */
  const run = async (busyKey: string, doneKey: string | null, action: () => Promise<void>, successTitle?: string) => {
    setBusy(busyKey);
    try {
      await action();
      if (doneKey) markDone(doneKey);
      if (successTitle) toast({ title: successTitle });
      router.refresh();
    } catch (error) {
      toast({ variant: "destructive", title: td.actionFailed, description: errorText(error, t) });
    } finally {
      setBusy(null);
    }
  };

  const moderate = (targetType: "restroom" | "review", targetId: string, decision: "approve" | "reject") =>
    run(
      `${decision}:${targetType}:${targetId}`,
      `${targetType}:${targetId}`,
      async () => {
        const { error } = await createClient().rpc("moderate_content", {
          target_type: targetType,
          target_id: targetId,
          decision,
        });
        if (error) throw toAppError(error);
      },
      decision === "approve" ? td.approved : td.rejected
    );

  const unban = (user: BannedUserItem) =>
    run(
      `unban:${user.id}`,
      `user:${user.id}`,
      async () => {
        const { error } = await createClient().rpc("unban_user", { user_id: user.id });
        if (error) throw toAppError(error);
      },
      format(td.unbannedToast, { name: userName(user.username) })
    );

  const runAi = (restroom: UncheckedRestroomItem) =>
    run(`ai:${restroom.id}`, null, async () => {
      const response = await fetch("/api/moderate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restroom_id: restroom.id }),
      });
      const body: unknown = await response.json().catch(() => null);
      if (!response.ok) throw new Error(td.aiFailed);
      const flaggedNow = typeof body === "object" && body !== null && "flagged" in body && body.flagged === true;
      const reason =
        typeof body === "object" && body !== null && "result" in body && typeof body.result === "object" && body.result !== null && "reason" in body.result && typeof body.result.reason === "string"
          ? body.result.reason
          : "";
      markDone(`unchecked:${restroom.id}`);
      toast({ title: flaggedNow ? td.aiFlaggedToast : td.aiClean, description: reason || undefined });
    });

  const visibleFlagged = flagged.filter((item) => !done.has(`restroom:${item.id}`));
  const visibleReported = reported.filter((item) => !done.has(`${item.targetType}:${item.targetId}`));
  const visibleBanned = banned.filter((item) => !done.has(`user:${item.id}`));
  const visibleUnchecked = unchecked.filter((item) => !done.has(`unchecked:${item.id}`) && !done.has(`restroom:${item.id}`));

  const sections: { id: SectionId; label: string; count: number }[] = [
    { id: "flagged", label: td.flagged, count: visibleFlagged.length },
    { id: "reports", label: td.reports, count: visibleReported.length },
    { id: "banned", label: td.banned, count: visibleBanned.length },
    { id: "unchecked", label: td.unchecked, count: visibleUnchecked.length },
  ];

  /** Approve / reject buttons (+ ban the author) shared by flagged and reported items. */
  const decisionButtons = (
    targetType: "restroom" | "review",
    targetId: string,
    name: string,
    author: { id: string | null; name: string | null }
  ) => {
    const anyBusy = busy !== null;
    return (
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          onClick={() => void moderate(targetType, targetId, "approve")}
          disabled={anyBusy}
          aria-label={format(td.approveLabel, { name })}
          className="flex-1"
        >
          {busy === `approve:${targetType}:${targetId}` ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Check aria-hidden="true" />}
          {td.approve}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="destructive"
          onClick={() => void moderate(targetType, targetId, "reject")}
          disabled={anyBusy}
          aria-label={format(td.rejectLabel, { name })}
          className="flex-1"
        >
          {busy === `reject:${targetType}:${targetId}` ? <Loader2 className="animate-spin" aria-hidden="true" /> : <X aria-hidden="true" />}
          {td.reject}
        </Button>
        {author.id && author.id !== viewerId && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setBanTarget({ id: author.id ?? "", name: userName(author.name) })}
            disabled={anyBusy}
            aria-label={format(td.banLabel, { name: userName(author.name) })}
          >
            <Ban aria-hidden="true" />
            {td.ban}
          </Button>
        )}
      </div>
    );
  };

  return (
    <div className="mx-auto flex w-full max-w-screen-md flex-col gap-6 px-4 py-5">
      <header className="flex flex-col gap-1">
        <h1 className="flex items-center gap-2 text-xl font-bold">
          <ShieldCheck className="h-6 w-6 text-primary" aria-hidden="true" />
          {td.heading}
        </h1>
        <p className="text-sm text-muted-foreground">{td.subtitle}</p>
      </header>

      {/* Jump links with counts */}
      <nav aria-label={td.sectionsLabel} className="-mx-4 overflow-x-auto px-4">
        <ul className="flex gap-2">
          {sections.map((section) => (
            <li key={section.id} className="shrink-0">
              <a
                href={`#${section.id}`}
                className="flex h-9 items-center gap-1.5 rounded-full border bg-card px-3 text-sm font-medium transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {section.label}
                <span
                  className={cn(
                    "min-w-5 rounded-full px-1.5 text-center text-xs tabular-nums",
                    section.count > 0 ? "bg-primary text-primary-foreground" : "bg-muted text-foreground/80"
                  )}
                >
                  {section.count}
                </span>
              </a>
            </li>
          ))}
        </ul>
      </nav>

      {/* ---- flagged restrooms ---- */}
      <Section id="flagged" title={td.flagged} count={visibleFlagged.length} emptyText={td.flaggedEmpty} icon={<Flag />}>
        {visibleFlagged.map((item) => (
          <Card key={item.id}>
            <ItemHeading href={`/restroom/${item.id}`} openLabel={td.open} title={item.name} />
            <p className="text-sm text-muted-foreground">{item.address}</p>
            <p className="text-xs text-muted-foreground">
              {format(td.addedBy, { name: userName(item.authorName) })} ·{" "}
              <time dateTime={item.createdAt} suppressHydrationWarning>
                {formatRelativeTime(item.createdAt, locale)}
              </time>
            </p>
            <div className="flex flex-wrap gap-1.5">
              {item.flagCount > 0 && (
                <Chip tone="warning">
                  <Flag className="h-3 w-3" aria-hidden="true" />
                  {plural(td.reportCount, item.flagCount)}
                </Chip>
              )}
            </div>
            {item.aiReason && (
              <p className="flex items-start gap-1.5 rounded-lg bg-muted p-2 text-xs">
                <Bot className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                {format(td.aiReason, { reason: item.aiReason })}
              </p>
            )}
            {decisionButtons("restroom", item.id, item.name, { id: item.authorId, name: item.authorName })}
          </Card>
        ))}
      </Section>

      {/* ---- reports, one card per reported item ---- */}
      <Section id="reports" title={td.reports} count={visibleReported.length} emptyText={td.reportsEmpty} icon={<Flag />}>
        {visibleReported.map((item) => {
          const name =
            item.title === null
              ? td.gone
              : item.targetType === "review"
                ? format(td.reviewOf, { name: item.title })
                : item.title;
          return (
            <Card key={`${item.targetType}:${item.targetId}`}>
              <ItemHeading
                href={item.restroomId ? `/restroom/${item.restroomId}` : null}
                openLabel={td.open}
                title={name}
              />
              {item.excerpt && <p className="line-clamp-3 whitespace-pre-line text-sm text-muted-foreground">{item.excerpt}</p>}
              {item.authorName && (
                <p className="text-xs text-muted-foreground">
                  {format(item.targetType === "review" ? td.wroteBy : td.addedBy, { name: item.authorName })}
                </p>
              )}
              <ul className="flex flex-col gap-1.5 border-l-2 pl-3">
                {item.reports.map((report) => (
                  <li key={report.id} className="text-xs">
                    <span className="font-medium">{t.moderation.report.reasons[report.reason]}</span>
                    <span className="text-muted-foreground">
                      {" · "}
                      {format(td.reportedBy, { name: userName(report.reporterName) })}
                      {" · "}
                      <time dateTime={report.createdAt} suppressHydrationWarning>
                        {formatRelativeTime(report.createdAt, locale)}
                      </time>
                    </span>
                    {report.details && <p className="mt-0.5 whitespace-pre-line break-words text-muted-foreground">“{report.details}”</p>}
                  </li>
                ))}
              </ul>
              {item.title !== null &&
                decisionButtons(item.targetType, item.targetId, name, { id: item.authorId, name: item.authorName })}
            </Card>
          );
        })}
      </Section>

      {/* ---- banned users ---- */}
      <Section id="banned" title={td.banned} count={visibleBanned.length} emptyText={td.bannedEmpty} icon={<Ban />}>
        {visibleBanned.map((user) => (
          <Card key={user.id} className="flex-row items-center">
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <p className="truncate font-medium">{userName(user.username)}</p>
              {user.reason && <p className="text-xs text-muted-foreground">{format(t.moderation.banned.reason, { reason: user.reason })}</p>}
              {user.bannedAt && (
                <p className="text-xs text-muted-foreground" suppressHydrationWarning>
                  {format(td.bannedSince, { time: formatRelativeTime(user.bannedAt, locale) })}
                </p>
              )}
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => void unban(user)}
              disabled={busy !== null}
              aria-label={format(td.unbanLabel, { name: userName(user.username) })}
            >
              {busy === `unban:${user.id}` ? <Loader2 className="animate-spin" aria-hidden="true" /> : <UserCheck aria-hidden="true" />}
              {td.unban}
            </Button>
          </Card>
        ))}
      </Section>

      {/* ---- not checked by the AI (e.g. the AI was down when they were added) ---- */}
      <Section id="unchecked" title={td.unchecked} count={visibleUnchecked.length} emptyText={td.uncheckedEmpty} icon={<Bot />}>
        {visibleUnchecked.map((item) => (
          <Card key={item.id} className="flex-row items-center">
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <Link href={`/restroom/${item.id}`} className="link-underline truncate font-medium">
                {item.name}
              </Link>
              <p className="truncate text-xs text-muted-foreground">
                {format(td.addedBy, { name: userName(item.authorName) })} ·{" "}
                <time dateTime={item.createdAt} suppressHydrationWarning>
                  {formatRelativeTime(item.createdAt, locale)}
                </time>
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => void runAi(item)}
              disabled={busy !== null}
              aria-label={format(td.runAiLabel, { name: item.name })}
            >
              {busy === `ai:${item.id}` ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Sparkles aria-hidden="true" />}
              <span className="hidden min-[400px]:inline">{td.runAi}</span>
            </Button>
          </Card>
        ))}
      </Section>

      <BanModal
        target={banTarget}
        onClose={() => setBanTarget(null)}
        onBanned={(target) => {
          markDone(`user-banned:${target.id}`);
          toast({ title: format(td.bannedToast, { name: target.name }) });
          router.refresh();
        }}
      />
    </div>
  );
}

// ---------- pieces ----------

function Section({
  id,
  title,
  count,
  emptyText,
  icon,
  children,
}: {
  id: SectionId;
  title: string;
  count: number;
  emptyText: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-heading`} className="flex scroll-mt-4 flex-col gap-2">
      <h2 id={`${id}-heading`} className="font-semibold">
        {title} <span className="font-normal text-muted-foreground">({count})</span>
      </h2>
      {count === 0 ? (
        <div className="rounded-xl border border-dashed">
          <EmptyState compact icon={icon} title={emptyText} />
        </div>
      ) : (
        <ul className="flex flex-col gap-2">{children}</ul>
      )}
    </section>
  );
}

function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <li className={cn("flex flex-col gap-2 rounded-xl border bg-card p-3 shadow-sm", className)}>{children}</li>;
}

function ItemHeading({ href, openLabel, title }: { href: string | null; openLabel: string; title: string }) {
  return (
    <div className="flex items-start justify-between gap-2">
      <h3 className="min-w-0 break-words font-medium">{title}</h3>
      {href && (
        <Button asChild variant="ghost" size="sm" className="-mr-2 -mt-1 h-8 shrink-0 px-2">
          <Link href={href} aria-label={`${openLabel}: ${title}`}>
            <ExternalLink aria-hidden="true" />
            {openLabel}
          </Link>
        </Button>
      )}
    </div>
  );
}

function Chip({ children, tone }: { children: ReactNode; tone: "warning" }) {
  return (
    <span
      className={cn(
        "flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
        tone === "warning" && "bg-amber-500/15 text-amber-800 dark:text-amber-300"
      )}
    >
      {children}
    </span>
  );
}

/** Asks for a reason (shown to the user), then calls ban_user. */
function BanModal({
  target,
  onClose,
  onBanned,
}: {
  target: { id: string; name: string } | null;
  onClose: () => void;
  onBanned: (target: { id: string; name: string }) => void;
}) {
  const { t } = useI18n();
  const td = t.moderation.dashboard;
  const { toast } = useToast();
  const id = useId();
  const [reason, setReason] = useState("");
  const [error, setError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [shakeKey, setShakeKey] = useState(0);

  const close = () => {
    if (saving) return;
    setReason("");
    setError(false);
    onClose();
  };

  const submit = async () => {
    if (!target) return;
    if (reason.trim().length === 0) {
      setError(true);
      setShakeKey((key) => key + 1);
      return;
    }
    setSaving(true);
    try {
      const { error: rpcError } = await createClient().rpc("ban_user", { user_id: target.id, reason: reason.trim() });
      if (rpcError) throw toAppError(rpcError);
      onBanned(target);
      setReason("");
      onClose();
    } catch (caught) {
      setShakeKey((key) => key + 1);
      toast({ variant: "destructive", title: td.actionFailed, description: errorText(caught, t) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={target !== null}
      onOpenChange={(open) => !open && close()}
      title={format(td.banTitle, { name: target?.name ?? "" })}
      description={td.banDescription}
      role="alertdialog"
      dismissible={!saving}
      shakeKey={shakeKey}
      icon={
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <Ban className="h-6 w-6" aria-hidden="true" />
        </span>
      }
      footer={
        <>
          <Button type="button" variant="outline" onClick={close} disabled={saving}>
            {t.common.cancel}
          </Button>
          <Button type="button" variant="destructive" onClick={() => void submit()} disabled={saving}>
            {saving ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Ban aria-hidden="true" />}
            {td.banConfirm}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${id}-reason`}>{td.banReasonLabel}</Label>
        <Textarea
          id={`${id}-reason`}
          value={reason}
          onChange={(event) => {
            setReason(event.target.value.slice(0, 300));
            setError(false);
          }}
          placeholder={td.banReasonPlaceholder}
          rows={3}
          maxLength={300}
          disabled={saving}
          aria-invalid={error}
          aria-describedby={error ? `${id}-error` : undefined}
        />
        {error && (
          <p id={`${id}-error`} role="alert" className="text-xs font-medium text-destructive">
            {td.banReasonRequired}
          </p>
        )}
      </div>
    </Modal>
  );
}
