import { useEffect, useState } from "react";
import { authClient } from "../AuthHelpers/auth-client";
import { trpc } from "../trpc";
import { useViewAsRole } from "./useViewAsRole";

// The feature list every page.*/admin.*-gated check in the app should read
// instead of session.enabledFeatures directly -- normally that's exactly
// what this returns, but while "view as role" (ViewAsRoleToggle.tsx) is
// active, it returns the *previewed* role's own feature list instead, so
// nav/route guards render as if that role were signed in. Only ever
// changes what renders on this client -- every actual tRPC call still runs
// under the real session's real permissions the whole time (see
// ViewAsRoleContext.tsx's own comment on why this is deliberately
// rendering-only, not real impersonation).
export function useEffectivePermissions(): string[] {
  const { data: session } = authClient.useSession();
  const { previewRole } = useViewAsRole();
  const [features, setFeatures] = useState<{ key: string; enabled: boolean }[] | undefined>(undefined);
  const [grants, setGrants] = useState<{ featureKey: string; role: string; granted: boolean }[] | undefined>(
    undefined,
  );

  useEffect(() => {
    if (!previewRole) return;
    let cancelled = false;
    // The same data AdminPermissions.tsx's grid already needs -- fetched
    // here too rather than adding a bespoke "features for role X" endpoint.
    // Only an owner ever reaches this (ViewAsRoleToggle.tsx's hard gate),
    // and owner already has admin.features.view/admin.role-permissions.view.
    void Promise.all([trpc.features.list.query(), trpc.featureRoles.listAll.query()]).then(([featureRows, grantRows]) => {
      if (!cancelled) {
        setFeatures(featureRows);
        setGrants(grantRows);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [previewRole]);

  if (!previewRole) return session?.enabledFeatures ?? [];
  // Data not loaded yet -- render as "nothing granted" rather than
  // flashing the real (fuller) session permissions for a beat; safer to
  // briefly under-show during a preview than to briefly show real access.
  if (!features || !grants) return [];

  const enabledKeys = new Set(features.filter((feature) => feature.enabled).map((feature) => feature.key));
  return grants
    .filter((grant) => grant.role === previewRole && grant.granted && enabledKeys.has(grant.featureKey))
    .map((grant) => grant.featureKey);
}
