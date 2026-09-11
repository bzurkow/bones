import { useEffect, useState } from "react";
import { authClient } from "./AuthHelpers/auth-client";
import { trpc } from "./trpc";
import { useViewAsRole } from "./hooks/useViewAsRole";
import styles from "./ViewAsRoleToggle.module.css";

// Floating bottom-right button group, owner only -- previews the app as
// each role would see it (hooks/useEffectivePermissions.ts substitutes the
// selected role's own feature list for the real session's everywhere a
// page.*/admin.* check reads through it). Rendering-only: every actual
// tRPC call still runs under the real session the whole time, this never
// changes what the server allows -- see ViewAsRoleContext.tsx's comment.
//
// Hardcoded to "owner" (not permission-table-driven itself) since it's the
// tool for *previewing* the permission table -- same bootstrap-role
// treatment as auth.ts's nextUserRole. Visibility beyond that gate is a
// per-user setting (ApplicationSettings.tsx's "Show view as role toggle"
// switch), same shape as ColorSchemeToggle's own showViewModeToggle.
//
// Deliberately never reads useEffectivePermissions()/the simulated
// feature list for anything -- its own gating and role list are always
// the *real* session (session.user.role, trpc.roles.list, unaffected by
// any active preview). Otherwise the one control that can turn a preview
// off could itself become unreachable while previewing a low-access role
// -- exactly the lockout this app's RBAC self-lockout guards exist to
// prevent elsewhere, so the same invariant applies here.
export function ViewAsRoleToggle() {
  const { data: session } = authClient.useSession();
  const { previewRole, setPreviewRole } = useViewAsRole();
  const [roles, setRoles] = useState<{ name: string }[]>([]);
  const isOwner = session?.user.role === "owner";

  useEffect(() => {
    if (!isOwner) return;
    void trpc.roles.list.query().then(setRoles);
  }, [isOwner]);

  if (!session || !isOwner || !session.user.showViewAsRoleToggle) return null;

  function handleClick(name: string) {
    // Clicking the already-active button turns the preview back off,
    // rather than needing a separate explicit "stop previewing" control.
    setPreviewRole(previewRole === name ? null : name);
  }

  return (
    <div className={styles.wrap} role="group" aria-label="View as role">
      {roles.map((role) => (
        <button
          key={role.name}
          type="button"
          className={`${styles.button} ${previewRole === role.name ? styles.buttonActive : ""}`}
          aria-pressed={previewRole === role.name}
          onClick={() => handleClick(role.name)}
        >
          {role.name}
        </button>
      ))}
    </div>
  );
}
