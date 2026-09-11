import { and, eq } from "drizzle-orm";
import { db } from "./db/index.js";
import { featureRoles, features, pageViewRoles, pageViews, routeRoles, routes } from "./db/schema.js";

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

// Same shape as hasPermission, against routes instead -- "can this role
// enter this route at all" (trpc.ts's adminProcedure, App.tsx's
// RequireAdmin). Split into its own table/function rather than folded
// into features: a route is a coarser, structural kind of gate than an
// in-page action permission, not just a differently-prefixed feature key.
export async function hasRouteAccess(role: string, routeKey: string): Promise<boolean> {
  const [row] = await db
    .select({ enabled: routes.enabled, granted: routeRoles.granted })
    .from(routes)
    .innerJoin(routeRoles, and(eq(routeRoles.routeKey, routes.key), eq(routeRoles.role, role)))
    .where(eq(routes.key, routeKey));

  return Boolean(row?.enabled && row.granted);
}

// Same shape again, against page_views -- "does this role see this
// specific tab within a route" (AdminLayout.tsx's per-tab filtering).
export async function hasPageViewAccess(role: string, pageViewKey: string): Promise<boolean> {
  const [row] = await db
    .select({ enabled: pageViews.enabled, granted: pageViewRoles.granted })
    .from(pageViews)
    .innerJoin(pageViewRoles, and(eq(pageViewRoles.pageViewKey, pageViews.key), eq(pageViewRoles.role, role)))
    .where(eq(pageViews.key, pageViewKey));

  return Boolean(row?.enabled && row.granted);
}

// Every key (across all three tables -- features, routes, page_views) this
// role currently has access to (enabled + granted, same two conditions as
// the functions above, just the whole set at once) -- called by auth.ts's
// customSession plugin to attach `enabledFeatures` to every session, the
// same resolve-once-centrally pattern hasAcceptedTermsAndConditions/
// avatarUrl already use. web-app reads this to decide what to render or
// redirect. One flat array on purpose, not three separate session fields
// -- a client-side hasFeature(list, key) check doesn't need to know or
// care which table a key ultimately came from, only whether it's present.
export async function getEnabledFeatures(role: string): Promise<string[]> {
  const [featureRows, routeRows, pageViewRows] = await Promise.all([
    db
      .select({ key: features.key })
      .from(features)
      .innerJoin(featureRoles, and(eq(featureRoles.featureKey, features.key), eq(featureRoles.role, role)))
      .where(and(eq(features.enabled, true), eq(featureRoles.granted, true))),
    db
      .select({ key: routes.key })
      .from(routes)
      .innerJoin(routeRoles, and(eq(routeRoles.routeKey, routes.key), eq(routeRoles.role, role)))
      .where(and(eq(routes.enabled, true), eq(routeRoles.granted, true))),
    db
      .select({ key: pageViews.key })
      .from(pageViews)
      .innerJoin(pageViewRoles, and(eq(pageViewRoles.pageViewKey, pageViews.key), eq(pageViewRoles.role, role)))
      .where(and(eq(pageViews.enabled, true), eq(pageViewRoles.granted, true))),
  ]);

  return [...featureRows, ...routeRows, ...pageViewRows].map((row) => row.key);
}
