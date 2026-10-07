import type { Metadata } from "next";
import { Trophy } from "lucide-react";

import { Leaderboard, type LeaderboardEntry } from "@/components/leaderboard/Leaderboard";
import { getCurrentUser } from "@/lib/auth/server";
import { format } from "@/lib/i18n/format";
import { getT } from "@/lib/i18n/server";
import { pageMetadata } from "@/lib/metadata";
import { createClient } from "@/lib/supabase/server";

export function generateMetadata(): Metadata {
  const { title, description } = getT().meta.leaderboard;
  return pageMetadata({ title, description, path: "/leaderboard" });
}

// Points change all the time: always render fresh
export const dynamic = "force-dynamic";

const LIMIT = 50;

export default async function LeaderboardPage() {
  const t = getT();
  const supabase = createClient();
  const [user, topResult] = await Promise.all([
    getCurrentUser(),
    supabase
      .from("profiles")
      .select("id, username, avatar_url, points, level")
      // Only people who have contributed something; banned accounts are left out (Phase 11)
      .gt("points", 0)
      .eq("is_banned", false)
      .order("points", { ascending: false })
      // Ties: whoever joined first ranks higher (stable order)
      .order("created_at", { ascending: true })
      .limit(LIMIT),
  ]);
  // Shown by app/error.tsx with a retry button
  if (topResult.error) throw new Error(topResult.error.message);

  // Rank with ties: equal points share a rank ("1, 2, 2, 4")
  const entries: LeaderboardEntry[] = [];
  topResult.data.forEach((row, index) => {
    const previous = entries[index - 1];
    entries.push({
      id: row.id,
      username: row.username ?? t.common.user,
      avatarUrl: row.avatar_url,
      points: row.points,
      level: row.level,
      rank: previous && previous.points === row.points ? previous.rank : index + 1,
    });
  });

  // Signed in but not in the top 50: show their own rank below the list
  let me: LeaderboardEntry | null = null;
  if (user && !entries.some((entry) => entry.id === user.id)) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, username, avatar_url, points, level")
      .eq("id", user.id)
      .maybeSingle();
    if (profile && profile.points > 0) {
      const { count } = await supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .gt("points", profile.points)
        .eq("is_banned", false);
      me = {
        id: profile.id,
        username: profile.username ?? t.common.user,
        avatarUrl: profile.avatar_url,
        points: profile.points,
        level: profile.level,
        rank: (count ?? 0) + 1,
      };
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-screen-md flex-col gap-4 px-4 py-5">
      <header className="flex flex-col gap-1">
        <h1 className="flex items-center gap-2 text-xl font-bold">
          <Trophy className="h-5 w-5 text-primary" aria-hidden="true" />
          {t.leaderboard.heading}
        </h1>
        <p className="text-sm text-muted-foreground">
          {format(t.leaderboard.subtitle, { limit: LIMIT })}
        </p>
      </header>
      <Leaderboard entries={entries} currentUserId={user?.id ?? null} me={me} />
    </div>
  );
}
