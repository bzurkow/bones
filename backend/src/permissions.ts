import { and, eq } from "drizzle-orm";
import { db } from "./db/index.js";
import { featureRoles, features } from "./db/schema.js";

// Read on every permission-gated request (trpc.ts's requirePermission) --
// a plain query, not cached, same reasoning as auth-protocols.ts's
// isAuthProtocolEnabled: this is an infrequent admin action, correctness
// (a grant/revoke takes effect on the very next request) matters more here
// than shaving a query off the request path.
//
// Fails closed on both halves: a feature that's been globally disabled
// (features.enabled) grants nothing to anyone regardless of role, and a
// (feature, role) pair with no feature_roles row at all -- the inner join
// below yields nothing -- means "not granted," not an error. There is no
// code-level bypass for "owner" here; owner's access is real, seeded data
// (every feature's migration seeds an owner row, and features.ts's create
// procedure does the same for new ones) so it goes through this exact same
// path as every other role.
export async function hasPermission(role: string, featureKey: string): Promise<boolean> {
  const [row] = await db
    .select({ enabled: features.enabled, granted: featureRoles.granted })
    .from(features)
    .innerJoin(featureRoles, and(eq(featureRoles.featureKey, features.key), eq(featureRoles.role, role)))
    .where(eq(features.key, featureKey));

  return Boolean(row?.enabled && row.granted);
}

// Every feature key this role currently has access to (enabled + granted,
// same two conditions as hasPermission above, just the whole set at once
// instead of one key at a time) -- called by auth.ts's customSession
// plugin to attach `enabledFeatures` to every session, the same
// resolve-once-centrally pattern hasAcceptedTermsAndConditions/avatarUrl
// already use. web-app reads this to decide what to render or redirect --
// both admin.* (show/hide a specific button) and page.* (route access)
// keys included, no filtering by prefix.
export async function getEnabledFeatures(role: string): Promise<string[]> {
  const rows = await db
    .select({ key: features.key })
    .from(features)
    .innerJoin(featureRoles, and(eq(featureRoles.featureKey, features.key), eq(featureRoles.role, role)))
    .where(and(eq(features.enabled, true), eq(featureRoles.granted, true)));

  return rows.map((row) => row.key);
}
