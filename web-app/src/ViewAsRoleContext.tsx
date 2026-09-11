import { useState } from "react";
import type { ReactNode } from "react";
import { STORAGE_KEY, ViewAsRoleContext } from "./view-as-role-context";

// localStorage only, not a server round-trip -- picking a role to preview
// is a per-viewer convenience (same category as ColorSchemeToggle's own
// browser-only fallback), not state anything else needs to read. Wrapped
// in try/catch since a private window or blocked site data can throw on
// either read or write; falls back to in-memory-only state for that tab
// rather than breaking the toggle.
export function ViewAsRoleProvider({ children }: { children: ReactNode }) {
  const [previewRole, setPreviewRoleState] = useState<string | null>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch {
      return null;
    }
  });

  function setPreviewRole(role: string | null) {
    setPreviewRoleState(role);
    try {
      if (role) localStorage.setItem(STORAGE_KEY, role);
      else localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Per-viewer convenience only -- fine if storage is unavailable.
    }
  }

  return <ViewAsRoleContext.Provider value={{ previewRole, setPreviewRole }}>{children}</ViewAsRoleContext.Provider>;
}
