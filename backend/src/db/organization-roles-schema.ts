import { pgTable, primaryKey, text } from "drizzle-orm/pg-core";
import { organizations } from "./organizations-schema.js";

// Per-organization RBAC -- mirrors roles-schema.ts exactly, scoped by
// organizationId. `name` only needs to be unique within an organization
// (not globally, unlike the global roles table), so the natural key is
// the (organizationId, name) pair, not `name` alone.
//
// "admin", "standard", and "viewer" are seeded for every organization
// (see this table's own migration, and organizations.ts's `create`,
// which seeds all three for a brand-new org in the same transaction as
// the org row itself) and are permanently undeletable (organization-
// roles.ts's `delete` procedure hardcodes this, same ad hoc-guard style
// as the global roles.ts) -- "admin"/"standard" are what
// organization_users.role's two values already meant before this table
// existed, and organization_users.role now has a real FK onto this table
// (see that file's own comment), so every member needs one of these rows
// to exist at all times. "viewer" has no membership meaning baked in yet
// (added after the first two, purely as a role someone could be granted
// permissions under, or assigned to via setMemberRole like any other row
// here) -- protected from deletion anyway, for the same "every
// organization starts with the same baseline roles" consistency the
// other two have, not because anything currently depends on it existing.
export const organizationRoles = pgTable(
  "organization_roles",
  {
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
  },
  (table) => [primaryKey({ columns: [table.organizationId, table.name] })],
);
