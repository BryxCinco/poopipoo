"use client";

import { useState } from "react";
import { Download, Eraser } from "lucide-react";

import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { useToast } from "@/hooks/use-toast";
import { RESTROOM_COLUMNS } from "@/lib/restrooms/mappers";
import { createClient } from "@/lib/supabase/client";

/** Every localStorage/sessionStorage key this app writes starts with this. */
const STORAGE_PREFIX = "poopipoo:";

function clearAppStorage(): void {
  for (const storage of [window.localStorage, window.sessionStorage]) {
    try {
      // Collect first: removing while iterating shifts the indexes
      const keys: string[] = [];
      for (let i = 0; i < storage.length; i += 1) {
        const key = storage.key(i);
        if (key?.startsWith(STORAGE_PREFIX)) keys.push(key);
      }
      keys.forEach((key) => storage.removeItem(key));
    } catch {
      // storage blocked: nothing saved there anyway
    }
  }
}

/** Gathers everything the signed-in user created (RLS limits it to their own rows). */
async function buildExport(userId: string, email: string) {
  const supabase = createClient();
  const [profile, restrooms, reviews, votes, agentQueries] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
    supabase.from("restrooms").select(RESTROOM_COLUMNS).eq("created_by", userId),
    supabase.from("reviews").select("*").eq("user_id", userId),
    supabase.from("review_votes").select("*").eq("user_id", userId),
    supabase.from("agent_queries").select("created_at").eq("user_id", userId),
  ]);
  const failed = [profile, restrooms, reviews, votes, agentQueries].find((result) => result.error);
  if (failed?.error) throw new Error(failed.error.message);

  return {
    app: "Poopipoo",
    exported_at: new Date().toISOString(),
    account: { id: userId, email },
    profile: profile.data,
    restrooms: restrooms.data,
    reviews: reviews.data,
    helpful_votes_given: votes.data,
    ai_agent_questions: agentQueries.data,
  };
}

function downloadJson(data: unknown, filename: string): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Give the browser a moment to start the download before freeing the blob
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

interface DataSettingsProps {
  /** null for guests (export needs an account) */
  account: { id: string; email: string } | null;
}

const rowClass =
  "group flex w-full items-center gap-3 px-3 py-3 text-left text-sm transition-colors duration-150 hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none disabled:opacity-60";

/** Settings → Data: clear what this device saved, export your data as JSON. */
export function DataSettings({ account }: DataSettingsProps) {
  const { toast } = useToast();
  const [clearOpen, setClearOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    if (!account) return;
    setExporting(true);
    try {
      const data = await buildExport(account.id, account.email);
      downloadJson(data, `poopipoo-data-${new Date().toISOString().slice(0, 10)}.json`);
      toast({ title: "Na-download ang data mo.", description: "JSON file ito ng account, CR, reviews at votes mo." });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Hindi ma-export ang data",
        description: error instanceof Error ? error.message : "Subukan ulit.",
      });
    } finally {
      setExporting(false);
    }
  };

  return (
    <section className="flex flex-col gap-2" aria-labelledby="data-heading">
      <h2 id="data-heading" className="font-semibold">
        Data
      </h2>
      <ul className="divide-y overflow-hidden rounded-xl border bg-card shadow-sm">
        {account && (
          <li>
            <button
              type="button"
              onClick={() => void handleExport()}
              disabled={exporting}
              aria-label="I-export ang data ko bilang JSON file"
              className={rowClass}
            >
              <Download className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <span className="flex flex-1 flex-col">
                <span>{exporting ? "Ine-export..." : "I-export ang data"}</span>
                <span className="text-xs text-muted-foreground">I-download bilang JSON file</span>
              </span>
            </button>
          </li>
        )}
        <li>
          <button
            type="button"
            onClick={() => setClearOpen(true)}
            aria-label="Burahin ang local data sa device na ito"
            className={rowClass}
          >
            <Eraser className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <span className="flex flex-1 flex-col">
              <span>I-clear ang local data</span>
              <span className="text-xs text-muted-foreground">Mga setting at data na naka-save sa device na ito</span>
            </span>
          </button>
        </li>
      </ul>

      <ConfirmModal
        open={clearOpen}
        onOpenChange={setClearOpen}
        variant="destructive"
        icon={Eraser}
        title="I-clear ang local data?"
        description="Mabubura sa device na ito ang mga setting (dark mode, AI agent, voice), recent searches, at mga CR na naka-save dito pero hindi pa na-upload. Hindi mabubura ang account at ang mga naka-save sa server. Lalabas ulit ang intro."
        confirmLabel="Oo, i-clear"
        cancelLabel="Huwag"
        onConfirm={() => {
          clearAppStorage();
          // Reload so every setting goes back to its default
          window.location.reload();
        }}
      />
    </section>
  );
}
