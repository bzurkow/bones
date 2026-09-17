-- Data-only migration -- no schema change (organization_features/
-- organization_feature_roles' shape is unchanged from 0019), so there's
-- nothing for `drizzle-kit generate` to diff; this file is hand-written,
-- same escape-hatch precedent as 0013_users_update_status.sql.
--
-- Backfills the four tab-update permissions (organization-permissions.ts's
-- ORGANIZATION_TAB_UPDATE_FEATURES) for every *existing* organization --
-- trpc/routers/organizations.ts's `create` seeds the same four for every
-- *new* one, in the same transaction as the org row itself. "admin" gets
-- all four granted, immediately -- "org admin must have all update
-- permissions in the organization. These cannot be removed" (organization-
-- feature-roles.ts's setGranted refuses to ever revoke an "admin" grant).
INSERT INTO "organization_features" ("organization_id", "key", "label", "enabled")
SELECT "id", 'profile.update', 'Profile > Update', true FROM "organizations"
UNION ALL
SELECT "id", 'members.update', 'Members > Update', true FROM "organizations"
UNION ALL
SELECT "id", 'roles.update', 'Roles > Update', true FROM "organizations"
UNION ALL
SELECT "id", 'permissions.update', 'Permissions > Update', true FROM "organizations";

INSERT INTO "organization_feature_roles" ("organization_id", "feature_key", "role", "granted")
SELECT "id", 'profile.update', 'admin', true FROM "organizations"
UNION ALL
SELECT "id", 'members.update', 'admin', true FROM "organizations"
UNION ALL
SELECT "id", 'roles.update', 'admin', true FROM "organizations"
UNION ALL
SELECT "id", 'permissions.update', 'admin', true FROM "organizations";
