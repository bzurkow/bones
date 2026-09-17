CREATE TABLE "organizations" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"blurb" text DEFAULT '' NOT NULL,
	"active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organization_users" (
	"organization_id" text NOT NULL,
	"user_id" text NOT NULL,
	CONSTRAINT "organization_users_organization_id_user_id_pk" PRIMARY KEY("organization_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "organization_users" ADD CONSTRAINT "organization_users_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_users" ADD CONSTRAINT "organization_users_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;

-- Seed data, not schema -- same hand-appended precedent as
-- 0010/0011/0014's own seed inserts (drizzle-kit's diffing only tracks
-- table shape, so this doesn't confuse a future `db:generate`).
--
-- Five keys, two different gates on purpose (per an explicit correction
-- mid-build, not the original ask): the Admin > Organizations tab
-- (page.admin.organizations to reach it, admin.organizations.view to
-- actually see the list, admin.organizations.update to edit one) is
-- oversight of existing organizations, not where they get created.
-- Creating one is an application-level action instead
-- (application.organizations.create) -- trpc/routers/organizations.ts's
-- `create` procedure is gated by that key, not an admin.organizations.create
-- that deliberately doesn't exist. application.organizations.update is
-- seeded here too for the same future app-level (non-admin) edit surface,
-- but has no call site yet -- only the admin tab's own update exists so
-- far, gated by admin.organizations.update. There's no
-- application.organizations.view at all: viewing an organization at the
-- application level is meant to be governed by membership
-- (organization_users), not a feature flag.
--
-- All five seeded owner-only, same "pending confirmation" treatment
-- 0011_workable_flatman.sql gave admin.features.create/page.admin.roles --
-- new permissions with no per-role sketch of their own yet.
INSERT INTO "features" ("key", "label", "enabled") VALUES
	('page.admin.organizations', 'Page > Admin > Organizations', true),
	('admin.organizations.view', 'Admin > Organizations > View', true),
	('admin.organizations.update', 'Admin > Organizations > Update', true),
	('application.organizations.create', 'Application > Organizations > Create', true),
	('application.organizations.update', 'Application > Organizations > Update', true);

INSERT INTO "feature_roles" ("feature_key", "role", "granted") VALUES
	('page.admin.organizations', 'owner', true),
	('admin.organizations.view', 'owner', true),
	('admin.organizations.update', 'owner', true),
	('application.organizations.create', 'owner', true),
	('application.organizations.update', 'owner', true);