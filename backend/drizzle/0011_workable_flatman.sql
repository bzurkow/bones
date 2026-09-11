CREATE TABLE "roles" (
	"name" text PRIMARY KEY NOT NULL
);
--> statement-breakpoint
CREATE TABLE "features" (
	"key" text PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "feature_roles" (
	"feature_key" text NOT NULL,
	"role" text NOT NULL,
	"granted" boolean DEFAULT false NOT NULL,
	CONSTRAINT "feature_roles_feature_key_role_pk" PRIMARY KEY("feature_key","role")
);
--> statement-breakpoint
ALTER TABLE "feature_roles" ADD CONSTRAINT "feature_roles_feature_key_features_key_fk" FOREIGN KEY ("feature_key") REFERENCES "public"."features"("key") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feature_roles" ADD CONSTRAINT "feature_roles_role_roles_name_fk" FOREIGN KEY ("role") REFERENCES "public"."roles"("name") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
-- Seed data + a hand-added FK, not schema -- drizzle-kit's own diffing only
-- tracks table shape (meta/0011_snapshot.json), so none of this below
-- confuses a future `db:generate` (same precedent as 0010_motionless_mimic.sql's
-- auth_protocols seed).

-- "owner" and "standard" are permanently undeletable (roles.ts's `delete`
-- procedure hardcodes this) -- owner is the bootstrap-privilege role,
-- standard is auth.ts's nextUserRole's hardcoded fallback for every signup
-- after the first. "administrator"/"demo" are ordinary, deletable rows.
INSERT INTO "roles" ("name") VALUES
	('owner'),
	('administrator'),
	('standard'),
	('demo');

-- The app's real capability list. Two of these (admin.features.create,
-- page.admin.roles) aren't in the user's original sketch -- they're needed
-- for the feature/role system to actually be usable going forward
-- (creating a *feature* itself, and page-gating the Roles admin tab), and
-- were seeded owner-only pending confirmation, same as every other
-- owner-only row below.
INSERT INTO "features" ("key", "label", "enabled") VALUES
	('admin.users.view', 'Admin > Users > View', true),
	('admin.users.update-owner', 'Admin > Users > Update Owner', true),
	('admin.users.update-role', 'Admin > Users > Update Role (other than Owner)', true),
	('admin.permissions.view', 'Admin > Permissions > View', true),
	('admin.permissions.update', 'Admin > Permissions > Update', true),
	('admin.role-permissions.view', 'Admin > Role Permissions > View', true),
	('admin.role-permissions.update', 'Admin > Role Permissions > Update', true),
	('admin.terms.update', 'Admin > Terms & Conditions > Update', true),
	('admin.features.view', 'Admin > Features > View', true),
	('admin.features.enable', 'Admin > Features > Enable', true),
	('admin.features.disable', 'Admin > Features > Disable', true),
	('admin.features.create', 'Admin > Features > Create', true),
	('admin.roles.create', 'Admin > Roles > Create', true),
	('admin.roles.delete', 'Admin > Roles > Delete', true),
	('page.admin.view', 'Page > Admin > View', true),
	('page.admin.users', 'Page > Admin > Users', true),
	('page.admin.permissions', 'Page > Admin > Permissions', true),
	('page.admin.site-settings', 'Page > Admin > Site Settings', true),
	('page.admin.terms', 'Page > Admin > Terms', true),
	('page.admin.roles', 'Page > Admin > Roles', true);

-- Grants, transcribed verbatim from the user's sketch (plus owner-only on
-- the two features above that weren't in it). Only `granted = true` rows
-- are inserted -- a missing (feature, role) pair means "not granted" (see
-- permissions.ts's hasPermission), so "standard" needs no rows at all: it
-- has zero grants in the sketch.
INSERT INTO "feature_roles" ("feature_key", "role", "granted") VALUES
	-- owner: every feature
	('admin.users.view', 'owner', true),
	('admin.users.update-owner', 'owner', true),
	('admin.users.update-role', 'owner', true),
	('admin.permissions.view', 'owner', true),
	('admin.permissions.update', 'owner', true),
	('admin.role-permissions.view', 'owner', true),
	('admin.role-permissions.update', 'owner', true),
	('admin.terms.update', 'owner', true),
	('admin.features.view', 'owner', true),
	('admin.features.enable', 'owner', true),
	('admin.features.disable', 'owner', true),
	('admin.features.create', 'owner', true),
	('admin.roles.create', 'owner', true),
	('admin.roles.delete', 'owner', true),
	('page.admin.view', 'owner', true),
	('page.admin.users', 'owner', true),
	('page.admin.permissions', 'owner', true),
	('page.admin.site-settings', 'owner', true),
	('page.admin.terms', 'owner', true),
	('page.admin.roles', 'owner', true),
	-- administrator: per the sketch, real granularity -- notably false on
	-- update-owner, role-permissions.update, terms.update, and both new
	-- owner-only rows
	('admin.users.view', 'administrator', true),
	('admin.users.update-role', 'administrator', true),
	('admin.permissions.view', 'administrator', true),
	('admin.permissions.update', 'administrator', true),
	('admin.role-permissions.view', 'administrator', true),
	('admin.features.view', 'administrator', true),
	('admin.features.enable', 'administrator', true),
	('admin.features.disable', 'administrator', true),
	('admin.roles.create', 'administrator', true),
	('admin.roles.delete', 'administrator', true),
	('page.admin.view', 'administrator', true),
	('page.admin.users', 'administrator', true),
	('page.admin.permissions', 'administrator', true),
	('page.admin.site-settings', 'administrator', true),
	('page.admin.terms', 'administrator', true),
	-- demo: view-only across the board, plus every Page > Admin > * (can
	-- navigate the whole admin area read-only)
	('admin.permissions.view', 'demo', true),
	('admin.role-permissions.view', 'demo', true),
	('admin.features.view', 'demo', true),
	('page.admin.view', 'demo', true),
	('page.admin.users', 'demo', true),
	('page.admin.permissions', 'demo', true),
	('page.admin.site-settings', 'demo', true),
	('page.admin.terms', 'demo', true);

-- Real DB-level integrity for users.role -- can't be declared in
-- auth-schema.ts itself (a Better Auth-generated file `db:auth:generate`
-- would overwrite), so it's added here by hand instead. Safe from a future
-- `db:generate`: drizzle-kit's diffing only ever compares schema-file
-- shape against its own last snapshot, never introspects the live DB, so a
-- constraint that exists in neither ever gets touched.
ALTER TABLE "users" ADD CONSTRAINT "users_role_roles_name_fk" FOREIGN KEY ("role") REFERENCES "public"."roles"("name") ON DELETE no action ON UPDATE no action;