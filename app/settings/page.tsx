import type { Metadata } from "next";
import { Settings } from "lucide-react";

import type { AgentUsage } from "@/components/profile/AgentSettings";
import { SettingsView, type SettingsAccount } from "@/components/settings/SettingsView";
import { getCurrentUser } from "@/lib/auth/server";
import { pageMetadata } from "@/lib/metadata";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = pageMetadata({
  title: "Settings",
  description: "I-edit ang account mo, dark mode, AI agent, at i-export o burahin ang data mo sa Poopipoo.",
  path: "/settings",
});

export default async function SettingsPage() {
  const user = await getCurrentUser();

  let account: SettingsAccount | null = null;
  let agentUsage: AgentUsage | null = null;

  if (user) {
    const supabase = createClient();
    // Start of today in Manila (UTC+8, no daylight saving)
    const MANILA_OFFSET_MS = 8 * 60 * 60 * 1000;
    const DAY_MS = 24 * 60 * 60 * 1000;
    const startOfToday = new Date(
      Math.floor((Date.now() + MANILA_OFFSET_MS) / DAY_MS) * DAY_MS - MANILA_OFFSET_MS
    ).toISOString();

    const [profileResult, agentTotalResult, agentTodayResult] = await Promise.all([
      supabase.from("profiles").select("username, avatar_url").eq("id", user.id).maybeSingle(),
      // AI agent usage (counts only, no rows)
      supabase.from("agent_queries").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      supabase
        .from("agent_queries")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .gte("created_at", startOfToday),
    ]);
    // Shown by app/error.tsx with a retry button
    if (profileResult.error) throw new Error(profileResult.error.message);

    account = {
      id: user.id,
      email: user.email ?? "",
      username: profileResult.data?.username ?? user.email?.split("@")[0] ?? "User",
      avatarUrl: profileResult.data?.avatar_url ?? null,
    };
    // Usage stats are optional: show "-" instead of failing the whole page
    agentUsage =
      agentTotalResult.error || agentTodayResult.error
        ? null
        : { total: agentTotalResult.count ?? 0, today: agentTodayResult.count ?? 0 };
  }

  return (
    <div className="mx-auto flex w-full max-w-screen-md flex-col gap-6 px-4 py-5">
      <h1 className="flex items-center gap-2 text-xl font-bold">
        <Settings className="h-5 w-5" aria-hidden="true" />
        Settings
      </h1>
      <SettingsView account={account} agentUsage={agentUsage} />
    </div>
  );
}
