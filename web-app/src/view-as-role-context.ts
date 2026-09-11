import { createContext } from "react";

// Split from ViewAsRoleContext.tsx/hooks/useViewAsRole.ts -- oxlint's
// react-refresh rule wants a file that exports a component (the Provider)
// to export *only* components, so the raw context object (needed by both
// the Provider and the hook) lives here instead of being a second export
// off either of them.
export const STORAGE_KEY = "bones:viewAsRole";

export interface ViewAsRoleContextValue {
  // null: no preview active, everything renders per the real session.
  // Ephemeral, client-only -- no DB column, unlike showViewAsRoleToggle
  // (whether the *button* shows at all). "View as" never changes what the
  // server actually allows, only what the client chooses to render -- see
  // hooks/useEffectivePermissions.ts.
  previewRole: string | null;
  setPreviewRole: (role: string | null) => void;
}

export const ViewAsRoleContext = createContext<ViewAsRoleContextValue>({
  previewRole: null,
  setPreviewRole: () => {},
});
