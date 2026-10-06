"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FileWarning } from "lucide-react";

import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { clearUnsavedChanges, hasUnsavedChanges } from "@/lib/unsaved-changes";

/**
 * Asks "May hindi ka pa na-save." before leaving a page with unsaved input.
 *
 * The App Router has no navigation-blocking API, so this:
 * - intercepts clicks on in-app links (header, bottom nav, cards) in the
 *   capture phase, before Next's <Link> handles them;
 * - uses the browser's own prompt (beforeunload) for reload / closing the tab.
 * Known gap: the phone's back gesture isn't intercepted.
 */
export function UnsavedChangesGuard() {
  const router = useRouter();
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (!hasUnsavedChanges() || event.defaultPrevented) return;
      // Let new-tab / download clicks through
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const anchor = (event.target as Element | null)?.closest?.("a[href]");
      if (!(anchor instanceof HTMLAnchorElement) || anchor.target === "_blank" || anchor.hasAttribute("download")) return;

      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      const samePage = url.pathname === window.location.pathname && url.search === window.location.search;
      if (samePage) return; // e.g. #anchors on the same page

      event.preventDefault();
      event.stopPropagation();
      setPendingHref(url.pathname + url.search + url.hash);
    };

    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!hasUnsavedChanges()) return;
      event.preventDefault();
      event.returnValue = ""; // required by some browsers to show the prompt
    };

    document.addEventListener("click", onClick, true);
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, []);

  return (
    <ConfirmModal
      open={pendingHref !== null}
      onOpenChange={(open) => {
        if (!open) setPendingHref(null);
      }}
      variant="destructive"
      icon={FileWarning}
      title="May hindi ka pa na-save."
      description="Mawawala ang mga nailagay mo kapag umalis ka sa page na ito."
      confirmLabel="Iwanan"
      cancelLabel="Manatili"
      onConfirm={() => {
        const href = pendingHref;
        clearUnsavedChanges();
        setPendingHref(null);
        if (href) router.push(href);
      }}
    />
  );
}
