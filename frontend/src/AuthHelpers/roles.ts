import type { authClient } from "./auth-client";

type SessionUser = NonNullable<ReturnType<typeof authClient.useSession>["data"]>["user"];

// session.user.role is a real, properly-typed field now that auth-client.ts
// runs better-auth's inferAdditionalFields<typeof auth>() plugin -- no more
// unknown-narrowing needed here.
export function isAdmin(user: SessionUser | undefined): boolean {
  return user?.role === "owner" || user?.role === "administrator";
}
