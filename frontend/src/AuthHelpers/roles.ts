// Mirrors backend/src/auth.ts's `user.additionalFields.role` enum. Not
// imported from `backend` directly -- that package's exports field only
// opens up its trpc router (see backend/package.json), not its auth/db
// modules -- so this is a small, deliberately-duplicated client-side copy
// until there's a real shared-types boundary.
export type UserRole = "owner" | "administrator" | "standard";

// better-auth's session type isn't parameterized with our additionalFields
// here (createAuthClient in auth-client.ts doesn't run the
// inferAdditionalFields plugin), so `role` reaches the client at runtime
// but not in TopBar's/App.tsx's static types (session.user's inferred type
// has no `role` property at all) -- this narrows it in one place, from
// `unknown`, instead of casting at every call site.
export function getUserRole(user: unknown): UserRole | undefined {
  const role = (user as { role?: unknown } | null | undefined)?.role;
  return role === "owner" || role === "administrator" || role === "standard" ? role : undefined;
}

export function isAdmin(user: unknown): boolean {
  const role = getUserRole(user);
  return role === "owner" || role === "administrator";
}
