"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CloudUpload, Loader2, Smartphone } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { loginUrl } from "@/lib/auth/return-url";
import { clearLocalRestrooms, getLocalRestrooms } from "@/lib/local-restrooms";
import { addRestrooms } from "@/lib/restroom-store";
import type { Restroom } from "@/types/restroom";

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
      const saved = await addRestrooms(
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
      clearLocalRestrooms();
      setLocal([]);
      toast({ title: `Na-upload ang ${saved} CR!`, description: "Nasa account mo na sila." });
      router.refresh();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Hindi ma-upload",
        description: error instanceof Error ? error.message : "Subukan ulit mamaya.",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <section
      aria-label="Mga CR sa device na ito"
      className="flex flex-col gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-950"
    >
      <div className="flex items-start gap-3">
        <Smartphone className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
        <div className="flex flex-col gap-1">
          <p className="font-semibold">
            May {local.length} CR ka sa device na ito.{" "}
            {userId ? "I-upload sa account mo?" : "Mag-login para i-upload sa account mo."}
          </p>
          <p className="text-sm text-amber-900/80">
            Idinagdag mo ang mga ito bago nagkaroon ng accounts. Makikita sila ng lahat pag na-upload.
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
            {uploading ? "Ina-upload..." : "I-upload"}
          </Button>
        ) : (
          <Button asChild size="sm" className="flex-1">
            <Link href={loginUrl(returnUrl)}>Mag-login</Link>
          </Button>
        )}
        <Button size="sm" variant="ghost" onClick={dismiss} disabled={uploading}>
          Mamaya na
        </Button>
      </div>
    </section>
  );
}
