ALTER TABLE "users" ADD COLUMN "inherit_view_mode_from_browser" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "view_mode" text DEFAULT 'light' NOT NULL;