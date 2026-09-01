ALTER TABLE "users" ADD COLUMN "role" text DEFAULT 'standard' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "deleted_at" timestamp;