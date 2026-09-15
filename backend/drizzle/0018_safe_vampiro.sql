ALTER TABLE "organizations" ADD COLUMN "avatar_url" text;--> statement-breakpoint
CREATE UNIQUE INDEX "organizations_name_lower_uidx" ON "organizations" USING btree (lower("name"));