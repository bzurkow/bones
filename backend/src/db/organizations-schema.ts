import { boolean, pgTable, text } from "drizzle-orm/pg-core";

// A group of users -- name/blurb/status, membership managed via
// organization_users (see that file's own comment). `active` is the same
// boolean-status convention as users.active/features.enabled/
// auth_protocols.enabled -- AdminOrganizations.tsx conveys it via its
// Table's inactive-row background (same grayscale-safe treatment
// AdminUsers.tsx's own status column settled on 2026-09-14, after its
// original colored green/red dot broke the grayscale-only rule), not a
// dedicated status column.
export const organizations = pgTable("organizations", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  blurb: text("blurb").notNull().default(""),
  active: boolean("active").notNull().default(true),
});
