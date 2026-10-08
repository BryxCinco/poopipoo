"use client";

import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Camera, Loader2, Trash2 } from "lucide-react";

import { AnimatedButton } from "@/components/ui/AnimatedButton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/hooks/use-i18n";
import { useToast } from "@/hooks/use-toast";
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";
import { AVATAR_TYPES, removeAvatar, uploadAvatar } from "@/lib/avatar";
import { errorText } from "@/lib/i18n/errors";
import { toAppError } from "@/lib/moderation/errors";
import { format } from "@/lib/i18n/format";
import { createClient } from "@/lib/supabase/client";

const USERNAME_MIN = 3;
const USERNAME_MAX = 40; // matches the profiles.username check in 0001

interface AccountSettingsProps {
  userId: string;
  email: string;
  username: string;
  avatarUrl: string | null;
}

/** Settings → Account: photo, username (editable), email (read-only). */
export function AccountSettings({ userId, email, username: initialUsername, avatarUrl: initialAvatar }: AccountSettingsProps) {
  const router = useRouter();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const { t } = useI18n();
  const ts = t.settings;

  const [username, setUsername] = useState(initialUsername);
  const [savedUsername, setSavedUsername] = useState(initialUsername);
  const [saving, setSaving] = useState(false);
  const [usernameError, setUsernameError] = useState<string | null>(null);

  const [avatarUrl, setAvatarUrl] = useState(initialAvatar);
  const [avatarBusy, setAvatarBusy] = useState(false);

  const trimmed = username.trim();
  const changed = trimmed !== savedUsername;
  // Typed a new username but didn't save: confirm before leaving the page
  useUnsavedChanges("username", changed && !saving);

  const saveUsername = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (trimmed.length < USERNAME_MIN || trimmed.length > USERNAME_MAX) {
      setUsernameError(format(ts.username.lengthError, { min: USERNAME_MIN, max: USERNAME_MAX }));
      return;
    }
    setUsernameError(null);
    setSaving(true);
    const { error } = await createClient().from("profiles").update({ username: trimmed }).eq("id", userId);
    setSaving(false);
    if (error) {
      toast({ variant: "destructive", title: ts.username.saveFailed, description: errorText(toAppError(error), t) });
      return;
    }
    setSavedUsername(trimmed);
    setUsername(trimmed);
    toast({ title: ts.username.saved });
    router.refresh();
  };

  const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = ""; // picking the same file again still triggers onChange
    if (!file) return;
    setAvatarBusy(true);
    try {
      const url = await uploadAvatar(createClient(), userId, file);
      setAvatarUrl(url);
      toast({ title: ts.photo.updated });
      router.refresh();
    } catch (error) {
      toast({
        variant: "destructive",
        title: ts.photo.uploadFailed,
        description: errorText(error, t),
      });
    } finally {
      setAvatarBusy(false);
    }
  };

  const handleRemove = async () => {
    setAvatarBusy(true);
    try {
      await removeAvatar(createClient(), userId);
      setAvatarUrl(null);
      toast({ title: ts.photo.removed });
      router.refresh();
    } catch (error) {
      toast({
        variant: "destructive",
        title: ts.photo.removeFailed,
        description: errorText(error, t),
      });
    } finally {
      setAvatarBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 rounded-xl border bg-card p-4 shadow-sm">
      {/* Photo */}
      <div className="flex items-center gap-4">
        <div className="relative">
          <Avatar className="h-16 w-16 shadow-md ring-2 ring-primary/20 ring-offset-2 ring-offset-background">
            {avatarUrl && <AvatarImage src={avatarUrl} alt="" />}
            <AvatarFallback className="bg-primary/10 text-xl font-semibold uppercase text-primary">
              {savedUsername.slice(0, 1)}
            </AvatarFallback>
          </Avatar>
          {avatarBusy && (
            <span className="absolute inset-0 flex items-center justify-center rounded-full bg-background/70">
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
              <span className="sr-only">{ts.photo.uploading}</span>
            </span>
          )}
        </div>
        <div className="flex flex-1 flex-wrap gap-2">
          <input
            ref={fileRef}
            id="avatar-file"
            type="file"
            accept={AVATAR_TYPES.join(",")}
            className="sr-only"
            onChange={(event) => void handleFile(event)}
            aria-label={ts.photo.choose}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={avatarBusy}
            onClick={() => fileRef.current?.click()}
            aria-label={avatarUrl ? ts.photo.changeLabel : ts.photo.uploadLabel}
          >
            <Camera aria-hidden="true" />
            {avatarUrl ? ts.photo.change : ts.photo.upload}
          </Button>
          {avatarUrl && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={avatarBusy}
              onClick={() => void handleRemove()}
              aria-label={ts.photo.removeLabel}
            >
              <Trash2 aria-hidden="true" />
              {ts.photo.remove}
            </Button>
          )}
          <p className="w-full text-xs text-muted-foreground">{ts.photo.hint}</p>
        </div>
      </div>

      {/* Username */}
      <form onSubmit={(event) => void saveUsername(event)} className="flex flex-col gap-1.5" noValidate>
        <Label htmlFor="settings-username">{ts.username.label}</Label>
        <div className="flex gap-2">
          <Input
            id="settings-username"
            value={username}
            onChange={(event) => {
              setUsername(event.target.value);
              setUsernameError(null);
            }}
            maxLength={USERNAME_MAX}
            autoComplete="nickname"
            aria-invalid={usernameError !== null}
            aria-describedby={usernameError ? "settings-username-error" : "settings-username-hint"}
          />
          <AnimatedButton type="submit" disabled={!changed} loading={saving} aria-label={ts.username.saveLabel}>
            {t.common.save}
          </AnimatedButton>
        </div>
        {usernameError ? (
          <p id="settings-username-error" role="alert" className="text-xs font-medium text-destructive">
            {usernameError}
          </p>
        ) : (
          <p id="settings-username-hint" className="text-xs text-muted-foreground">
            {ts.username.hint}
          </p>
        )}
      </form>

      {/* Email (read-only) */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="settings-email">{t.auth.email}</Label>
        <Input id="settings-email" value={email} readOnly aria-readonly="true" className="bg-muted/50 text-foreground/80" />
      </div>
    </div>
  );
}
