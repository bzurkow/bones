import { sql } from "drizzle-orm";
import { boolean, pgTable, text, uniqueIndex } from "drizzle-orm/pg-core";

// A group of users -- name/blurb/status/avatar, membership managed via
// organization_users (see that file's own comment). `active` is the same
// boolean-status convention as users.active/features.enabled/
// auth_protocols.enabled -- AdminOrganizations.tsx conveys it via its
// Table's inactive-row background (same grayscale-safe treatment
// AdminUsers.tsx's own status column settled on 2026-09-14, after its
// original colored green/red dot broke the grayscale-only rule), not a
// dedicated status column.
//
// avatarUrl holds an S3 object key, not a URL -- same convention as
// users.avatarUrl (see auth.ts's additionalFields comment) -- resolved to
// a real presigned URL by storage/index.ts's resolveAvatarUrl wherever an
// org row is returned to a client.
//
// name has a case-insensitive unique index (on lower(name), an expression
// index, not a plain column constraint) -- /organizations/<name> routes
// look organizations up by name and treat case as insignificant (see
// trpc/routers/organizations.ts's getByName), so two organizations
// differing only in case would make that lookup ambiguous. Application-
// level pre-checks in `create`/`update` give a clean BAD_REQUEST before
// ever hitting this constraint; the index is the real backstop.
export const organizations = pgTable(
  "organizations",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    blurb: text("blurb").notNull().default(""),
    active: boolean("active").notNull().default(true),
    avatarUrl: text("avatar_url"),
  },
  (table) => [uniqueIndex("organizations_name_lower_uidx").on(sql`lower(${table.name})`)],
);
