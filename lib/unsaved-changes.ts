/**
 * Which forms currently have unsaved input (e.g. "add-restroom", "review").
 * Read by <UnsavedChangesGuard> to confirm before leaving the page.
 * Module-level so any component can register without prop drilling.
 */

const dirtySources = new Set<string>();

export function setUnsavedChanges(source: string, dirty: boolean): void {
  if (dirty) dirtySources.add(source);
  else dirtySources.delete(source);
}

export function hasUnsavedChanges(): boolean {
  return dirtySources.size > 0;
}

/** After the user chose to leave anyway. */
export function clearUnsavedChanges(): void {
  dirtySources.clear();
}
