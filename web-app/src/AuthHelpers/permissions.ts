// Checks a plain feature-key list -- normally session.enabledFeatures
// (see backend/src/permissions.ts's getEnabledFeatures), but every
// page.*/admin.*-gated check in the app should actually call this through
// hooks/useEffectivePermissions.ts, not with session.enabledFeatures
// directly, so a "view as role" preview (ViewAsRoleToggle.tsx) can
// substitute a different role's list transparently. Both admin.* (show/
// hide a specific button) and page.* (route access) keys live in the same
// list, no prefix-based split. Replaces the old role-name isAdmin check
// (backend/src/user-fields.ts's USER_ROLES retired along with it) -- roles
// are admin-creatable/deletable now, so there's no fixed set of
// "privileged" role names to compare against on the client either.
export function hasFeature(features: string[] | null | undefined, key: string): boolean {
  return features?.includes(key) ?? false;
}
