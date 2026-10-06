"use client";

import { useEffect } from "react";

import { setUnsavedChanges } from "@/lib/unsaved-changes";

/** Marks `source` as having unsaved input while `dirty` is true (cleared on unmount). */
export function useUnsavedChanges(source: string, dirty: boolean): void {
  useEffect(() => {
    setUnsavedChanges(source, dirty);
    return () => setUnsavedChanges(source, false);
  }, [source, dirty]);
}
