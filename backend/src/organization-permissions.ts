import { and, eq } from "drizzle-orm";
import { db } from "./db/index.js";
import { organizationFeatureRoles, organizationFeatures, organizationUsers } from "./db/schema.js";
import { hasPermission } from "./permissions.js";

// The four tabs on /organizations/<name> each have their own update
// permission -- view is membership alone (canViewOrg below), update is
// per-tab. These are organization_features rows, seeded for every
// organization (this table's own migration for existing orgs,
// trpc/routers/organizations.ts's `create` for new ones) -- not something
// an org creates itself, same "seeded by the app, not a live create-
// feature form" precedent organization-features-schema.ts's own comment
// documents for org-scoped features generally.
export const ORGANIZATION_TAB_UPDATE_FEATURES = [
  "profile.update",
  "members.update",
  "roles.update",
  "permissions.update",
] as const;

// The one organization every fresh database is seeded with (backend/drizzle/
// 0022_default_organization.sql -- the org row itself, its three
// organization_roles, and its four ORGANIZATION_TAB_UPDATE_FEATURES rows
// above, "admin" granted), so Organizations has real content immediately
// after a from-scratch migration run rather than an empty list. auth.ts's
// databaseHooks.user.create `after` hook adds whichever user becomes Owner
// (nextUserRole's existing "first user ever" rule, unchanged) as this
// organization's own admin member the moment that happens, so it's never
// left adminless in practice. A plain literal, not a generated id, on
// purpose -- unlike every app-created organization (crypto.randomUUID()),
// this one has to be the *same* id on every fresh database for the
// migration and this constant to agree on which row they mean; there's no
// compile-time link between the two, so keep both in sync by hand if this
// ever changes.
export const DEFAULT_ORGANIZATION_ID = "default";

// Whether this user has any membership row at all in this organization
// (any role) -- the base building block canViewOrg below and every
// org-scoped router's own view checks are built on. Lives here, not in
// trpc/routers/organizations.ts, so organization-roles.ts/organization-
// features.ts/organization-feature-roles.ts can import it too without a
// circular import back through that router file.
export async function isOrganizationMember(organizationId: string, userId: string): Promise<boolean> {
  const [row] = await db
    .select({ userId: organizationUsers.userId })
    .from(organizationUsers)
    .where(
      and(
        eq(organizationUsers.organizationId, organizationId),
        eq(organizationUsers.userId, userId),
        eq(organizationUsers.active, true),
      ),
    )
    .limit(1);
  return Boolean(row);
}

// The /organizations/<name> page's own access rule (and every tab on
// it), not a feature-flag key: a member of the organization can view it,
// and admin.organizations.update is a global override on top (an admin
// who isn't a member can still open any org) -- see the redirect rule
// this was built from ("if a user is not permissioned to an
// organization, route them back to /organizations unless they have
// Admin > Organizations > Update").
export async function canViewOrg(organizationId: string, userId: string, role: string): Promise<boolean> {
  if (await hasPermission(role, "admin.organizations.update")) return true;
  return isOrganizationMember(organizationId, userId);
}

// Per-organization RBAC -- mirrors permissions.ts exactly, scoped by
// organizationId. Fails closed at three points, not two: no membership
// row at all (not a member of this organization) means no permission
// regardless of what the org's own feature_roles say, same as the other
// two halves (features.enabled, feature_roles.granted) permissions.ts's
// own hasPermission already fails closed on. Not cached, same "an infrequent
// admin action, correctness over shaving a query" reasoning as that file.
export async function hasOrganizationPermission(
  organizationId: string,
  userId: string,
  featureKey: string,
): Promise<boolean> {
  const [membership] = await db
    .select({ role: organizationUsers.role })
    .from(organizationUsers)
    .where(
      and(
        eq(organizationUsers.organizationId, organizationId),
        eq(organizationUsers.userId, userId),
        eq(organizationUsers.active, true),
      ),
    );

  if (!membership) return false;

  const [row] = await db
    .select({ enabled: organizationFeatures.enabled, granted: organizationFeatureRoles.granted })
    .from(organizationFeatures)
    .innerJoin(
      organizationFeatureRoles,
      and(
        eq(organizationFeatureRoles.organizationId, organizationFeatures.organizationId),
        eq(organizationFeatureRoles.featureKey, organizationFeatures.key),
        eq(organizationFeatureRoles.role, membership.role),
      ),
    )
    .where(and(eq(organizationFeatures.organizationId, organizationId), eq(organizationFeatures.key, featureKey)));

  return Boolean(row?.enabled && row.granted);
}

// requireOrganizationPermission's own check (trpc.ts) -- "if a user has
// [the global] admin organization update permission, then yes, they can
// update, OR they have to have the [org-scoped] organization update
// permission." Same override-on-top-of-a-narrower-check shape as
// canViewOrg above, just for a write instead of a view.
export async function canUpdateOrg(
  organizationId: string,
  userId: string,
  globalRole: string,
  featureKey: string,
): Promise<boolean> {
  if (await hasPermission(globalRole, "admin.organizations.update")) return true;
  return hasOrganizationPermission(organizationId, userId, featureKey);
}

// Every organization-scoped feature key this member currently has access
// to, same shape as permissions.ts's own getEnabledFeatures -- no current
// call site (session.enabledFeatures is global-role-only, org membership
// varies per org so it can't live there), built as the org-scoped analog
// ready for whenever a future org-scoped feature needs client-side
// render/redirect decisions the way the global one does.
export async function getEnabledOrganizationFeatures(organizationId: string, role: string): Promise<string[]> {
  const rows = await db
    .select({ key: organizationFeatures.key })
    .from(organizationFeatures)
    .innerJoin(
      organizationFeatureRoles,
      and(
        eq(organizationFeatureRoles.organizationId, organizationFeatures.organizationId),
        eq(organizationFeatureRoles.featureKey, organizationFeatures.key),
        eq(organizationFeatureRoles.role, role),
      ),
    )
    .where(
      and(
        eq(organizationFeatures.organizationId, organizationId),
        eq(organizationFeatures.enabled, true),
        eq(organizationFeatureRoles.granted, true),
      ),
    );

  return rows.map((row) => row.key);
}
