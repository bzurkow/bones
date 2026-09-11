CREATE TABLE "page_view_roles" (
	"page_view_key" text NOT NULL,
	"role" text NOT NULL,
	"granted" boolean DEFAULT false NOT NULL,
	CONSTRAINT "page_view_roles_page_view_key_role_pk" PRIMARY KEY("page_view_key","role")
);
--> statement-breakpoint
CREATE TABLE "page_views" (
	"key" text PRIMARY KEY NOT NULL,
	"route_key" text NOT NULL,
	"label" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "route_roles" (
	"route_key" text NOT NULL,
	"role" text NOT NULL,
	"granted" boolean DEFAULT false NOT NULL,
	CONSTRAINT "route_roles_route_key_role_pk" PRIMARY KEY("route_key","role")
);
--> statement-breakpoint
CREATE TABLE "routes" (
	"key" text PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
ALTER TABLE "page_view_roles" ADD CONSTRAINT "page_view_roles_page_view_key_page_views_key_fk" FOREIGN KEY ("page_view_key") REFERENCES "public"."page_views"("key") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "page_view_roles" ADD CONSTRAINT "page_view_roles_role_roles_name_fk" FOREIGN KEY ("role") REFERENCES "public"."roles"("name") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "page_views" ADD CONSTRAINT "page_views_route_key_routes_key_fk" FOREIGN KEY ("route_key") REFERENCES "public"."routes"("key") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "route_roles" ADD CONSTRAINT "route_roles_route_key_routes_key_fk" FOREIGN KEY ("route_key") REFERENCES "public"."routes"("key") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "route_roles" ADD CONSTRAINT "route_roles_role_roles_name_fk" FOREIGN KEY ("role") REFERENCES "public"."roles"("name") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
-- Seed data + a data migration off the old table, not schema -- drizzle-kit's
-- own diffing only tracks table shape, so none of this confuses a future
-- `db:generate` (same precedent as every prior hand-appended seed).
--
-- "routes"/"page_views" split out of "features", where these lived as
-- "page.admin.view"/"page.admin.<tab>" -- a route (the umbrella "can you
-- enter /admin at all" gate) and a page view (per-tab visibility within a
-- route) are two different kinds of row, not two features that happened to
-- share a naming convention. Grants transcribed exactly from what the old
-- page.admin.* feature_roles rows already held (verified by querying them
-- before writing this), not re-guessed.
INSERT INTO "routes" ("key", "label", "enabled") VALUES
	('admin', 'Admin', true);

INSERT INTO "route_roles" ("route_key", "role", "granted") VALUES
	('admin', 'owner', true),
	('admin', 'administrator', true),
	('admin', 'demo', true);

INSERT INTO "page_views" ("key", "route_key", "label", "enabled") VALUES
	('admin.users', 'admin', 'Admin > Users', true),
	('admin.permissions', 'admin', 'Admin > Permissions', true),
	('admin.roles', 'admin', 'Admin > Roles', true),
	('admin.site-settings', 'admin', 'Admin > Site Settings', true),
	('admin.terms', 'admin', 'Admin > Terms', true);

INSERT INTO "page_view_roles" ("page_view_key", "role", "granted") VALUES
	('admin.users', 'owner', true),
	('admin.users', 'administrator', true),
	('admin.users', 'demo', true),
	('admin.permissions', 'owner', true),
	('admin.permissions', 'administrator', true),
	('admin.permissions', 'demo', true),
	('admin.roles', 'owner', true),
	('admin.site-settings', 'owner', true),
	('admin.site-settings', 'administrator', true),
	('admin.site-settings', 'demo', true),
	('admin.terms', 'owner', true),
	('admin.terms', 'administrator', true),
	('admin.terms', 'demo', true);

-- The old page.admin.* rows' own feature_roles grants cascade-delete
-- automatically via that table's own FK (onDelete: "cascade").
DELETE FROM "features" WHERE "key" LIKE 'page.admin%';

-- New ask: an "authorization protocols" feature, hooking auth-protocols.ts
-- (email/google sign-in toggles) into the same permission system the rest
-- of the admin area already uses -- it predates RBAC and had been left on
-- the coarse adminProcedure-only gate. Owner-only, not administrator, per
-- the same sensitivity judgment as admin.terms.update (both owner-only) --
-- getting this wrong can lock every credential sign-up/sign-in out, a
-- bigger blast radius than most admin.* actions.
INSERT INTO "features" ("key", "label", "enabled") VALUES
	('admin.auth-protocols.update', 'Admin > Authorization Protocols > Update', true);

INSERT INTO "feature_roles" ("feature_key", "role", "granted") VALUES
	('admin.auth-protocols.update', 'owner', true);