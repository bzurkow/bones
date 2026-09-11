import type { authClient } from "./auth-client";

type Session = NonNullable<ReturnType<typeof authClient.useSession>["data"]>;

// Every feature key the current session's role has access to (see
// backend/src/permissions.ts's getEnabledFeatures) -- both admin.* (show/
// hide a specific button) and page.* (route access) keys live in the same
// list, no prefix-based split. Replaces the old role-name isAdmin check
// (backend/src/user-fields.ts's USER_ROLES retired along with it) -- roles
// are admin-creatable/deletable now, so there's no fixed set of
// "privileged" role names to compare against on the client either.
// undefined session (still loading, or signed out) never has access to
// anything.
export function hasFeature(session: Session | null | undefined, key: string): boolean {
  return session?.enabledFeatures.includes(key) ?? false;
}
