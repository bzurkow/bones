import { eq } from "drizzle-orm";
import { db } from "./db/index.js";
import { authProtocols } from "./db/schema.js";

// The full set this app actually knows how to gate -- auth.ts's hooks only
// ever check these two paths/providers, and trpc/routers/auth-protocols.ts
// only ever accepts one of these as input. Adding a new sign-in method
// means adding it here, to auth.ts's hook, AND to the seed migration
// (0010_motionless_mimic.sql) -- all three, not just one.
export const AUTH_PROTOCOLS = ["email", "google"] as const;
export type AuthProtocolName = (typeof AUTH_PROTOCOLS)[number];

// Matches the seed migration (0010_motionless_mimic.sql) exactly -- the
// migration is what actually seeds the DB rows, this just gives
// test/reset-db.ts a single place to read the same values from, instead of
// duplicating the raw "email" / "google" literals there.
export const DEFAULT_ENABLED_AUTH_PROTOCOLS: ReadonlySet<AuthProtocolName> = new Set(["email"]);

// Read on every gated sign-in/sign-up request (auth.ts) -- a plain query,
// not cached, since this is an infrequent admin action and correctness
// (a toggle takes effect on the very next request) matters more here than
// shaving a query off the auth path.
export async function isAuthProtocolEnabled(name: AuthProtocolName): Promise<boolean> {
  const [row] = await db.select({ enabled: authProtocols.enabled }).from(authProtocols).where(eq(authProtocols.name, name));
  // Fail open, not closed -- a missing row (seed migration not run yet, or
  // a protocol added here before its seed row exists) should never be able
  // to lock every sign-in path out by itself.
  return row?.enabled ?? true;
}
