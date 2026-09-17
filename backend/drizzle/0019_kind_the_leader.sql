CREATE TABLE "organization_roles" (
	"organization_id" text NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "organization_roles_organization_id_name_pk" PRIMARY KEY("organization_id","name")
);
--> statement-breakpoint
CREATE TABLE "organization_features" (
	"organization_id" text NOT NULL,
	"key" text NOT NULL,
	"label" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	CONSTRAINT "organization_features_organization_id_key_pk" PRIMARY KEY("organization_id","key")
);
--> statement-breakpoint
CREATE TABLE "organization_feature_roles" (
	"organization_id" text NOT NULL,
	"feature_key" text NOT NULL,
	"role" text NOT NULL,
	"granted" boolean DEFAULT false NOT NULL,
	CONSTRAINT "organization_feature_roles_organization_id_feature_key_role_pk" PRIMARY KEY("organization_id","feature_key","role")
);
--> statement-breakpoint
ALTER TABLE "organization_roles" ADD CONSTRAINT "organization_roles_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_features" ADD CONSTRAINT "organization_features_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_feature_roles" ADD CONSTRAINT "organization_feature_roles_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_feature_roles" ADD CONSTRAINT "organization_feature_roles_organization_id_feature_key_organization_features_organization_id_key_fk" FOREIGN KEY ("organization_id","feature_key") REFERENCES "public"."organization_features"("organization_id","key") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_feature_roles" ADD CONSTRAINT "organization_feature_roles_organization_id_role_organization_roles_organization_id_name_fk" FOREIGN KEY ("organization_id","role") REFERENCES "public"."organization_roles"("organization_id","name") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint

-- Seed data, not schema -- same hand-appended precedent as 0010/0011/0014/
-- 0016's own seed inserts. Every existing organization gets "admin",
-- "standard", and "viewer" organization_roles rows before the
-- organization_users FK below is added -- that FK needs "admin"/
-- "standard" to already exist (every current organization_users.role
-- value is one of those two, see organization-users-schema.ts's own
-- comment), and ADD CONSTRAINT validates against present data at the
-- moment it runs. "viewer" has no existing organization_users rows
-- depending on it yet -- seeded alongside the other two anyway so every
-- organization starts with the same three, not two now and a third
-- backfilled later.
INSERT INTO "organization_roles" ("organization_id", "name")
SELECT "id", 'admin' FROM "organizations"
UNION ALL
SELECT "id", 'standard' FROM "organizations"
UNION ALL
SELECT "id", 'viewer' FROM "organizations";

ALTER TABLE "organization_users" ADD CONSTRAINT "organization_users_organization_id_role_organization_roles_organization_id_name_fk" FOREIGN KEY ("organization_id","role") REFERENCES "public"."organization_roles"("organization_id","name") ON DELETE no action ON UPDATE no action;