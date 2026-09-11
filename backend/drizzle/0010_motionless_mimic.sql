CREATE TABLE "auth_protocols" (
	"name" text PRIMARY KEY NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
-- Seed data, not schema -- drizzle-kit's own diffing only tracks table
-- shape (meta/0010_snapshot.json), so hand-appending these INSERTs here
-- won't confuse a future `db:generate`. The app's known protocol list
-- lives in src/auth-protocols.ts; only "email" starts enabled.
INSERT INTO "auth_protocols" ("name", "enabled") VALUES
	('email', true),
	('google', false);
