-- Data-only migration -- no schema change (organizations/organization_roles/
-- organization_features/organization_feature_roles' shape is unchanged
-- from 0021), so there's nothing for `drizzle-kit generate` to diff; this
-- file is hand-written and has no matching meta/0022_snapshot.json, same
-- escape-hatch precedent as 0013_users_update_status.sql and
-- 0020_organization_tab_update_permissions.sql.
--
-- Seeds exactly one organization, id 'default' (organization-permissions.ts's
-- DEFAULT_ORGANIZATION_ID -- keep both in sync by hand, there's no
-- compile-time link between a migration and the TS constant it mirrors).
-- Per an explicit ask: every environment should have something real in
-- Organizations right after a fresh migration run, not an empty list.
-- Left with zero members here on purpose -- auth.ts's own
-- databaseHooks.user.create `after` hook adds whichever user becomes Owner
-- (nextUserRole's existing "first user ever" rule, unchanged by this) as
-- this organization's own admin the moment that happens, so a hand-picked
-- member row here would just be wrong the instant a real signup occurs.
--
-- Same three-part shape 0016/0019/0020 already establish for any
-- organization, in FK dependency order: organization_roles (admin/
-- standard/viewer) before organization_features/organization_feature_roles
-- (the four tab-update permissions, organization-permissions.ts's
-- ORGANIZATION_TAB_UPDATE_FEATURES, "admin" granted all four -- "org admin
-- must have all update permissions in the organization," same as every
-- other org).
INSERT INTO "organizations" ("id", "name", "blurb", "active") VALUES
	('default', 'Default Organization', '', true);

INSERT INTO "organization_roles" ("organization_id", "name") VALUES
	('default', 'admin'),
	('default', 'standard'),
	('default', 'viewer');

INSERT INTO "organization_features" ("organization_id", "key", "label", "enabled") VALUES
	('default', 'profile.update', 'Profile > Update', true),
	('default', 'members.update', 'Members > Update', true),
	('default', 'roles.update', 'Roles > Update', true),
	('default', 'permissions.update', 'Permissions > Update', true);

INSERT INTO "organization_feature_roles" ("organization_id", "feature_key", "role", "granted") VALUES
	('default', 'profile.update', 'admin', true),
	('default', 'members.update', 'admin', true),
	('default', 'roles.update', 'admin', true),
	('default', 'permissions.update', 'admin', true);
