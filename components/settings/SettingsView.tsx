"use client";

import { useState } from "react";
import Link from "next/link";
import { Bell, Languages, LogIn, UserX } from "lucide-react";

import { LogoutButton } from "@/components/auth/LogoutButton";
import { AgentSettings, type AgentUsage } from "@/components/profile/AgentSettings";
import { ThemeSetting } from "@/components/profile/ThemeSetting";
import { AccountSettings } from "@/components/settings/AccountSettings";
import { DataSettings } from "@/components/settings/DataSettings";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { useToast } from "@/hooks/use-toast";
import { loginUrl } from "@/lib/auth/return-url";

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

/** Not built yet: shown with a "Soon" badge. */
const PLACEHOLDERS = [
  { label: "Language", description: "Filipino / English", icon: Languages },
  { label: "Notifications", description: "PWA push notifications", icon: Bell },
] as const;

export function SettingsView({ account, agentUsage }: SettingsViewProps) {
  const { toast } = useToast();
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <>
      {/* Account */}
      <section className="flex flex-col gap-2" aria-labelledby="account-heading">
        <h2 id="account-heading" className="font-semibold">
          Account
        </h2>
        {account ? (
          <AccountSettings
            userId={account.id}
            email={account.email}
            username={account.username}
            avatarUrl={account.avatarUrl}
          />
        ) : (
          <div className="flex flex-col items-center gap-3 rounded-xl border p-5 text-center">
            <p className="text-sm text-muted-foreground">Mag-login para ma-edit ang username at photo mo.</p>
            <Button asChild className="w-full">
              <Link href={loginUrl("/settings")}>
                <LogIn aria-hidden="true" />
                Mag-login
              </Link>
            </Button>
          </div>
        )}
      </section>

      {/* Preferences */}
      <section className="flex flex-col gap-2" aria-labelledby="preferences-heading">
        <h2 id="preferences-heading" className="font-semibold">
          Preferences
        </h2>
        <ul className="divide-y overflow-hidden rounded-xl border bg-card shadow-sm">
          <li>
            <ThemeSetting />
          </li>
          {PLACEHOLDERS.map(({ label, description, icon: Icon }) => (
            <li key={label}>
              <button
                type="button"
                onClick={() => toast({ title: label, description: "Malapit na ito sa susunod na update." })}
                aria-label={`${label} (malapit na)`}
                className="flex w-full items-center gap-3 px-3 py-3 text-left text-sm transition-colors duration-150 hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none"
              >
                <Icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                <span className="flex flex-1 flex-col">
                  <span>{label}</span>
                  <span className="text-xs text-muted-foreground">{description}</span>
                </span>
                <Badge variant="secondary" className="font-normal">
                  Soon
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
        <section className="flex flex-col gap-2" aria-label="Logout at pag-delete ng account">
          <LogoutButton />
          <Button
            type="button"
            variant="ghost"
            onClick={() => setDeleteOpen(true)}
            aria-label="I-delete ang account"
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            <UserX aria-hidden="true" />
            I-delete ang account
          </Button>
          {/* Placeholder: deleting accounts isn't available yet */}
          <ConfirmModal
            open={deleteOpen}
            onOpenChange={setDeleteOpen}
            icon={UserX}
            title="I-delete ang account?"
            description="Hindi pa ito available. Sa susunod na update, permanenteng mabubura rito ang account mo, kasama ang mga review at points mo. Pwede mo munang i-export ang data mo sa itaas."
            confirmLabel="Okay"
            onConfirm={() => undefined}
          />
        </section>
      )}
    </>
  );
}
