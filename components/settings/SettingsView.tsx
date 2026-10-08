"use client";

import { useState } from "react";
import Link from "next/link";
import { Bell, Languages, LogIn, UserX } from "lucide-react";

import { LanguageSwitch } from "@/components/i18n/LanguageSwitch";

import { LogoutButton } from "@/components/auth/LogoutButton";
import { AgentSettings, type AgentUsage } from "@/components/profile/AgentSettings";
import { ThemeSetting } from "@/components/profile/ThemeSetting";
import { AccountSettings } from "@/components/settings/AccountSettings";
import { DataSettings } from "@/components/settings/DataSettings";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { useI18n } from "@/hooks/use-i18n";
import { useToast } from "@/hooks/use-toast";
import { loginUrl } from "@/lib/auth/return-url";
import { format } from "@/lib/i18n/format";

export interface SettingsAccount {
  id: string;
  email: string;
  username: string;
  avatarUrl: string | null;
}

interface SettingsViewProps {
  /** null for guests */
  account: SettingsAccount | null;
  agentUsage: AgentUsage | null;
}


export function SettingsView({ account, agentUsage }: SettingsViewProps) {
  const { toast } = useToast();
  const { t } = useI18n();
  const [deleteOpen, setDeleteOpen] = useState(false);
  // Not built yet: shown with a "Soon" badge
  const placeholders = [{ label: t.settings.notifications, description: t.settings.notificationsDescription, icon: Bell }];

  return (
    <>
      {/* Account */}
      <section className="flex flex-col gap-2" aria-labelledby="account-heading">
        <h2 id="account-heading" className="font-semibold">
          {t.settings.account}
        </h2>
        {account ? (
          <AccountSettings
            userId={account.id}
            email={account.email}
            username={account.username}
            avatarUrl={account.avatarUrl}
          />
        ) : (
          <div className="flex flex-col items-center gap-3 rounded-xl border bg-card p-5 text-center shadow-sm">
            <p className="text-sm text-muted-foreground">{t.settings.loginPrompt}</p>
            <Button asChild className="w-full">
              <Link href={loginUrl("/settings")}>
                <LogIn aria-hidden="true" />
                {t.common.login}
              </Link>
            </Button>
          </div>
        )}
      </section>

      {/* Preferences */}
      <section className="flex flex-col gap-2" aria-labelledby="preferences-heading">
        <h2 id="preferences-heading" className="font-semibold">
          {t.settings.preferences}
        </h2>
        <ul className="divide-y overflow-hidden rounded-xl border bg-card shadow-sm">
          {/* Language: Tagalog / English (saved in a cookie, applies right away) */}
          <li className="flex flex-col gap-2 px-3 py-3">
            <div className="flex items-center gap-3 text-sm">
              <Languages className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <span className="flex flex-1 flex-col">
                <span id="language-label">{t.settings.language}</span>
                <span className="text-xs text-muted-foreground">{t.settings.languageDescription}</span>
              </span>
            </div>
            <LanguageSwitch labelledBy="language-label" />
          </li>
          <li>
            <ThemeSetting />
          </li>
          {placeholders.map(({ label, description, icon: Icon }) => (
            <li key={label}>
              <button
                type="button"
                onClick={() => toast({ title: label, description: t.common.comingSoon })}
                aria-label={format(t.settings.soonLabel, { label })}
                className="flex w-full items-center gap-3 px-3 py-3 text-left text-sm transition-colors duration-150 hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none"
              >
                <Icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                <span className="flex flex-1 flex-col">
                  <span>{label}</span>
                  <span className="text-xs text-muted-foreground">{description}</span>
                </span>
                <Badge variant="secondary" className="font-normal">
                  {t.common.soon}
                </Badge>
              </button>
            </li>
          ))}
        </ul>
      </section>

      {/* AI agent on/off (per device) + usage */}
      <AgentSettings usage={agentUsage} />

      <DataSettings account={account ? { id: account.id, email: account.email } : null} />

      {account && (
        <section className="flex flex-col gap-2" aria-label={t.settings.accountActions}>
          <LogoutButton />
          <Button
            type="button"
            variant="ghost"
            onClick={() => setDeleteOpen(true)}
            aria-label={t.settings.deleteAccount}
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            <UserX aria-hidden="true" />
            {t.settings.deleteAccount}
          </Button>
          {/* Placeholder: deleting accounts isn't available yet */}
          <ConfirmModal
            open={deleteOpen}
            onOpenChange={setDeleteOpen}
            icon={UserX}
            title={t.settings.deleteTitle}
            description={t.settings.deleteDescription}
            confirmLabel={t.common.okay}
            onConfirm={() => undefined}
          />
        </section>
      )}
    </>
  );
}
