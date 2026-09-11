import { authClient } from "../AuthHelpers/auth-client";
import { useViewAsRole } from "./useViewAsRole";

export interface EffectivePermissions {
  features: string[];
  // true only while a preview is active but its derived feature list
  // hasn't loaded yet (see ViewAsRoleContext.tsx). Callers that redirect
  // on missing access (RequireAdmin) must wait for this to clear before
  // deciding -- otherwise a role that genuinely *does* have access would
  // get redirected away during the loading flash, before ever finding
  // out. Callers that just show/hide nav (TopBar, AdminLayout) can safely
  // ignore this and treat a momentarily-empty list as "not shown yet."
  isLoading: boolean;
}

// The feature list every page.*/admin.*-gated check in the app should
// read instead of session.enabledFeatures directly -- normally that's
// exactly what this returns, but while "view as role"
// (ViewAsRoleToggle.tsx) is active, it returns the *previewed* role's own
// feature list instead, so nav/route guards render as if that role were
// signed in. Only ever changes what renders on this client -- every
// actual tRPC call still runs under the real session's real permissions
// the whole time (see ViewAsRoleContext.tsx's own comment on why this is
// deliberately rendering-only, not real impersonation). A thin reader
// over ViewAsRoleContext's already-fetched data -- this hook itself does
// no fetching, so calling it from several components at once (as
// RequireAdmin/TopBar/AdminLayout all do) costs nothing extra.
export function useEffectivePermissions(): EffectivePermissions {
  const { data: session } = authClient.useSession();
  const { previewRole, previewFeatures } = useViewAsRole();

  if (!previewRole) return { features: session?.enabledFeatures ?? [], isLoading: false };
  if (previewFeatures === undefined) return { features: [], isLoading: true };
  return { features: previewFeatures, isLoading: false };
}
