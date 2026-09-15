import { relations } from "drizzle-orm";
import { pgTable, primaryKey, text } from "drizzle-orm/pg-core";
import { users } from "./auth-schema.js";
import { organizations } from "./organizations-schema.js";

// Single source of truth for organization_users.role's allowed values --
// same VIEW_MODES-style precedent as user-fields.ts, just scoped to this
// one table instead of a cross-cutting user field. Two values only (not
// the app's global, admin-creatable/deletable `roles` table) -- this is
// membership standing within one organization, a much smaller concept.
// Every organization must have at least one "admin" from the moment it's
// created (trpc/routers/organizations.ts's `create` inserts the initial
// admin's row in the same transaction as the organization itself) --
// there's currently no ongoing guard stopping every admin from later being
// demoted to "standard," though; that's a real gap worth a follow-up, not
// enforced this pass.
export const ORGANIZATION_MEMBER_ROLES = ["admin", "standard"] as const;
export type OrganizationMemberRole = (typeof ORGANIZATION_MEMBER_ROLES)[number];

// Many-to-many join between organizations and users. `role` is this join's
// own payload column (added once the admin tab needed to distinguish an
// org's admin from its ordinary members -- see the migration that added
// it), same reasoning feature_roles' `granted` boolean has for living on
// the join row itself rather than a separate table. Composite primary key,
// same reasoning as feature_roles/user_terms_and_conditions: nothing else
// could meaningfully identify a row.
export const organizationUsers = pgTable(
  "organization_users",
  {
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: text("role").notNull().default("standard"),
  },
  (table) => [primaryKey({ columns: [table.organizationId, table.userId] })],
);

export const organizationUsersRelations = relations(organizationUsers, ({ one }) => ({
  organization: one(organizations, {
    fields: [organizationUsers.organizationId],
    references: [organizations.id],
  }),
  user: one(users, {
    fields: [organizationUsers.userId],
    references: [users.id],
  }),
}));
