import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { trpc } from "./trpc";
import { STORAGE_KEY, ViewAsRoleContext } from "./view-as-role-context";

// The ONE place that fetches features/featureRoles and derives a
// previewed role's effective feature list -- every consumer
// (hooks/useEffectivePermissions.ts) reads the already-computed result
// from context instead of each firing its own fetch. Consolidated here
// after the per-consumer version (RequireAdmin, TopBar, AdminLayout each
// independently fetching) piled up into an ever-growing batched tRPC
// request on real usage -- eventually a genuine 414 URI Too Long.
//
// localStorage for previewRole only, not a server round-trip -- picking a
// role to preview is a per-viewer convenience (same category as
// ColorSchemeToggle's own browser-only fallback), not state anything else
// needs to read. Wrapped in try/catch since a private window or blocked
// site data can throw on either read or write; falls back to
// in-memory-only state for that tab rather than breaking the toggle.
export function ViewAsRoleProvider({ children }: { children: ReactNode }) {
  const [previewRole, setPreviewRoleState] = useState<string | null>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch {
      return null;
    }
  });
  const [previewFeatures, setPreviewFeatures] = useState<string[] | undefined>(undefined);

  function setPreviewRole(role: string | null) {
    setPreviewRoleState(role);
    try {
      if (role) localStorage.setItem(STORAGE_KEY, role);
      else localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Per-viewer convenience only -- fine if storage is unavailable.
    }
  }

  useEffect(() => {
    // Nothing to reset when previewRole goes back to null -- the hook
    // never reads previewFeatures in that case (see
    // hooks/useEffectivePermissions.ts), so a stale value just sits
    // unused until the next preview overwrites it.
    if (!previewRole) return;
    let cancelled = false;
    // Clears the *previous* role's stale derived list immediately, so a
    // switch from one preview role to another doesn't briefly keep
    // rendering the old role's permissions while the new fetch is still
    // in flight -- the same legitimate fetch-on-mount case AdminTerms.tsx's
    // own load() effect documents, not the anti-pattern the lint rule
    // means to catch.
    // oxlint-disable-next-line react/set-state-in-effect
    setPreviewFeatures(undefined);
    // The same data AdminPermissions.tsx's grid already needs -- fetched
    // here too rather than adding a bespoke "features for role X"
    // endpoint. Only an owner ever reaches this (ViewAsRoleToggle.tsx's
    // hard gate), and owner already has admin.features.view/
    // admin.role-permissions.view on all three tables. Three independent
    // (feature/grant) pairs, matching permissions.ts's getEnabledFeatures
    // union server-side -- a previewed role's effective list has to
    // include routes/page_views too, not just features, or the preview
    // would never actually hide an admin tab.
    void Promise.all([
      trpc.features.list.query(),
      trpc.featureRoles.listAll.query(),
      trpc.routes.list.query(),
      trpc.routeRoles.listAll.query(),
      trpc.pageViews.list.query(),
      trpc.pageViewRoles.listAll.query(),
    ]).then(([featureRows, featureGrants, routeRows, routeGrants, pageViewRows, pageViewGrants]) => {
      if (cancelled) return;

      function derive<Row extends { key: string; enabled: boolean }, Grant extends { role: string; granted: boolean }>(
        rows: Row[],
        grants: Grant[],
        grantKeyOf: (grant: Grant) => string,
      ): string[] {
        const enabledKeys = new Set(rows.filter((row) => row.enabled).map((row) => row.key));
        return grants
          .filter((grant) => grant.role === previewRole && grant.granted && enabledKeys.has(grantKeyOf(grant)))
          .map(grantKeyOf);
      }

      setPreviewFeatures([
        ...derive(featureRows, featureGrants, (grant) => grant.featureKey),
        ...derive(routeRows, routeGrants, (grant) => grant.routeKey),
        ...derive(pageViewRows, pageViewGrants, (grant) => grant.pageViewKey),
      ]);
    });
    return () => {
      cancelled = true;
    };
  }, [previewRole]);

  return (
    <ViewAsRoleContext.Provider value={{ previewRole, setPreviewRole, previewFeatures }}>
      {children}
    </ViewAsRoleContext.Provider>
  );
}
