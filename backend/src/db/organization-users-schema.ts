import { relations } from "drizzle-orm";
import { boolean, foreignKey, pgTable, primaryKey, text } from "drizzle-orm/pg-core";
import { users } from "./auth-schema.js";
import { organizationRoles } from "./organization-roles-schema.js";
import { organizations } from "./organizations-schema.js";

// Many-to-many join between organizations and users. `role` used to be a
// fixed two-value column (ORGANIZATION_MEMBER_ROLES, retired once
// organization-roles-schema.ts landed) -- now a real FK onto
// organization_roles, scoped by the same organizationId, same evolution
// users.role itself went through when the global RBAC system replaced the
// old fixed USER_ROLES union. "admin" and "standard" still always exist
// as real rows (see organization-roles-schema.ts's own comment) and are
// permanently undeletable, so this FK never dangles for existing data --
// but a role can still be deleted out from under nothing (organization-
// roles.ts's own delete guard checks for exactly that, the same "checked
// explicitly rather than left to the FK to reject" precedent roles.ts
// uses). `granted` is this join's own payload column (added once the
// admin tab needed to distinguish an org's admin from its ordinary
// members), same reasoning feature_roles' `granted` boolean has for
// living on the join row itself rather than a separate table. Composite
// primary key, same reasoning as feature_roles/user_terms_and_conditions:
// nothing else could meaningfully identify a row.
//
// `active` is a soft-delete flag, not membership itself going away --
// removeMember sets it false rather than deleting the row (same
// boolean-status convention as users.active/organizations.active/
// features.enabled). The row has to survive removal because the primary
// key is (organizationId, userId): re-adding a previously-removed member
// hits that same key, and a real delete would just let a plain re-insert
// handle it -- soft-delete exists specifically so a removal is
// reversible/auditable instead of silently forgetting the membership (and
// whatever role it had) ever existed. Every read of this table that means
// "is this a member right now" (isOrganizationMember, listMembers, the
// org cards page, memberCount) filters on active = true; addMember
// upserts (reactivating a matching inactive row) rather than
// onConflictDoNothing, since a plain no-op there would leave a
// re-add silently failing to undo the earlier removal.
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
    active: boolean("active").notNull().default(true),
  },
  (table) => [
    primaryKey({ columns: [table.organizationId, table.userId] }),
    foreignKey({
      columns: [table.organizationId, table.role],
      foreignColumns: [organizationRoles.organizationId, organizationRoles.name],
    }),
  ],
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
