import { boolean, foreignKey, pgTable, primaryKey, text } from "drizzle-orm/pg-core";
import { organizationFeatures } from "./organization-features-schema.js";
import { organizationRoles } from "./organization-roles-schema.js";
import { organizations } from "./organizations-schema.js";

// Per-organization RBAC -- mirrors feature-roles-schema.ts exactly, scoped
// by organizationId. `granted` is a plain boolean, same reasoning as the
// global table's own comment (granularity comes from defining many narrow
// features, not a tri-state on one coarse one).
//
// organizationId isn't just carried along for convenience -- it's part of
// both composite foreign keys below (organization_features and
// organization_roles are each keyed by (organizationId, key/name), not
// key/name alone), so a row here can't reference a feature or role
// belonging to a *different* organization than the one it's scoped to.
// Composite primary key across all three columns, same "nothing else
// could meaningfully identify a row" reasoning as the global table's own.
export const organizationFeatureRoles = pgTable(
  "organization_feature_roles",
  {
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    featureKey: text("feature_key").notNull(),
    role: text("role").notNull(),
    granted: boolean("granted").notNull().default(false),
  },
  (table) => [
    primaryKey({ columns: [table.organizationId, table.featureKey, table.role] }),
    foreignKey({
      columns: [table.organizationId, table.featureKey],
      foreignColumns: [organizationFeatures.organizationId, organizationFeatures.key],
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.organizationId, table.role],
      foreignColumns: [organizationRoles.organizationId, organizationRoles.name],
    }).onDelete("cascade"),
  ],
);
