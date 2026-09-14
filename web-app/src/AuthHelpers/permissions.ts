// Checks a plain feature-key list -- always session.enabledFeatures (see
// backend/src/permissions.ts's getEnabledFeatures) in practice; every
// page.*/admin.*-gated check in the app calls this with session?.enabledFeatures
// directly. Both admin.* (show/hide a specific button) and page.* (route
// access) keys live in the same list, no prefix-based split. Replaces the
// old role-name isAdmin check (backend/src/user-fields.ts's USER_ROLES
// retired along with it) -- roles are admin-creatable/deletable now, so
// there's no fixed set of "privileged" role names to compare against on the
// client either.
//
// A "view as role" preview toggle (ViewAsRoleToggle.tsx, a separate
// useEffectivePermissions hook substituting a previewed role's derived
// feature list in front of this) existed 2026-09-11–14 and was removed
// after real feature-flagging problems traced back to it -- every check
// reads the real session's own enabledFeatures again, no indirection.
export function hasFeature(features: string[] | null | undefined, key: string): boolean {
  return features?.includes(key) ?? false;
}
