"use client";

import { CalendarDays, MessageCircleQuestion, Sparkles } from "lucide-react";

import { useAgentEnabled } from "@/hooks/use-agent-enabled";
import { useI18n } from "@/hooks/use-i18n";
import { cn } from "@/lib/utils";

export interface AgentUsage {
  total: number;
  today: number;
}

interface AgentSettingsProps {
  /** null when the stats couldn't be loaded */
  usage: AgentUsage | null;
}

/** Settings → "AI Agent": show/hide the assistant button, plus usage stats. */
export function AgentSettings({ usage }: AgentSettingsProps) {
  const [enabled, setEnabled] = useAgentEnabled();
  const { t } = useI18n();

  const stats = [
    { label: t.agent.totalQuestions, value: usage?.total, icon: MessageCircleQuestion },
    { label: t.agent.today, value: usage?.today, icon: CalendarDays },
  ];

  return (
    <section className="flex flex-col gap-2" aria-labelledby="ai-agent-heading">
      <h2 id="ai-agent-heading" className="font-semibold">
        {t.agent.settingsHeading}
      </h2>
      <div className="flex flex-col gap-3 rounded-lg border bg-card p-3">
        <div className="flex items-center gap-3">
          <Sparkles className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p id="ai-agent-toggle-label" className="text-sm font-medium">
              {t.agent.title}
            </p>
            <p className="text-xs text-muted-foreground">{t.agent.toggleDescription}</p>
          </div>
          {/* Switch built on a button (no extra package): role="switch" + aria-checked */}
          <button
            type="button"
            role="switch"
            aria-checked={enabled}
            aria-labelledby="ai-agent-toggle-label"
            onClick={() => setEnabled(!enabled)}
            className={cn(
              "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              enabled ? "bg-primary" : "bg-input"
            )}
          >
            <span
              aria-hidden="true"
              className={cn(
                "h-5 w-5 rounded-full bg-background shadow transition-transform",
                enabled ? "translate-x-[22px]" : "translate-x-0.5"
              )}
            />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {stats.map(({ label, value, icon: Icon }) => (
            <div key={label} className="flex items-center gap-2 rounded-md bg-muted/50 px-3 py-2">
              <Icon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <div className="flex flex-col">
                <span className="text-lg font-bold leading-tight">{value ?? "-"}</span>
                <span className="text-[11px] leading-tight text-muted-foreground">{label}</span>
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">{t.agent.rateLimitNote}</p>
      </div>
    </section>
  );
}
