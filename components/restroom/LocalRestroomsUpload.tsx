"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CloudUpload, Loader2, Smartphone } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { loginUrl } from "@/lib/auth/return-url";
import { getLocalRestrooms, setLocalRestrooms } from "@/lib/local-restrooms";
import { addRestrooms } from "@/lib/restroom-store";
import type { Restroom } from "@/types/restroom";
import { useI18n } from "@/hooks/use-i18n";
import { errorText } from "@/lib/i18n/errors";
import { plural } from "@/lib/i18n/format";

// "Mamaya na" hides the prompt for this browser session only.
const DISMISS_KEY = "poopipoo:local-upload-dismissed";

interface LocalRestroomsUploadProps {
  /** Signed-in user's id, or null for guests (they're asked to log in first). */
  userId: string | null;
  /** Where to come back to after logging in (guests only). */
  returnUrl: string;
}

/**
 * Offers to upload restrooms saved in this browser's localStorage (from before
 * accounts existed) to the signed-in user's account.
 */
export function LocalRestroomsUpload({ userId, returnUrl }: LocalRestroomsUploadProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useI18n();
  const [local, setLocal] = useState<Restroom[]>([]);
  const [uploading, setUploading] = useState(false);

  // localStorage is only readable after mount
  useEffect(() => {
    let dismissed = false;
    try {
      dismissed = window.sessionStorage.getItem(DISMISS_KEY) === "1";
    } catch {
      // sessionStorage blocked: just show the prompt
    }
    if (!dismissed) setLocal(getLocalRestrooms());
  }, []);

  if (local.length === 0) return null;

  const dismiss = () => {
    try {
      window.sessionStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // ignore
    }
    setLocal([]);
  };

  const upload = async () => {
    if (!userId) return;
    setUploading(true);
    try {
      const { saved, error } = await addRestrooms(
        local.map((r) => ({
          name: r.name,
          description: r.description,
          address: r.address,
          latitude: r.latitude,
          longitude: r.longitude,
          amenities: r.amenities,
          images: r.images,
          isFree: r.isFree,
        })),
        userId
      );
      // Keep what wasn't uploaded (e.g. stopped by the rate limit) for next time
      const remaining = local.slice(saved);
      setLocalRestrooms(remaining);
      setLocal(remaining);
      if (saved > 0) {
        toast({ title: plural(t.localUpload.uploaded, saved), description: t.localUpload.uploadedDescription });
        router.refresh();
      }
      if (error) throw error;
    } catch (error) {
      toast({
        variant: "destructive",
        title: t.localUpload.uploadFailed,
        description: errorText(error, t),
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <section
      aria-label={t.localUpload.label}
      className="flex flex-col gap-3 rounded-lg border border-highlight/40 bg-highlight/10 p-4 text-foreground"
    >
      <div className="flex items-start gap-3">
        <Smartphone className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
        <div className="flex flex-col gap-1">
          <p className="font-semibold">
            {plural(t.localUpload.count, local.length)}{" "}
            {userId ? t.localUpload.uploadPrompt : t.localUpload.loginPrompt}
          </p>
          <p className="text-sm text-muted-foreground">
            {t.localUpload.explanation}
          </p>
        </div>
      </div>
      <div className="flex gap-2">
        {userId ? (
          <Button size="sm" onClick={() => void upload()} disabled={uploading} className="flex-1">
            {uploading ? (
              <Loader2 className="animate-spin" aria-hidden="true" />
            ) : (
              <CloudUpload aria-hidden="true" />
            )}
            {uploading ? t.localUpload.uploading : t.localUpload.upload}
          </Button>
        ) : (
          <Button asChild size="sm" className="flex-1">
            <Link href={loginUrl(returnUrl)}>{t.common.login}</Link>
          </Button>
        )}
        <Button size="sm" variant="ghost" onClick={dismiss} disabled={uploading}>
          {t.localUpload.later}
        </Button>
      </div>
    </section>
  );
}
