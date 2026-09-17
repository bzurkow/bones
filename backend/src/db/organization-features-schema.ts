import { boolean, pgTable, primaryKey, text } from "drizzle-orm/pg-core";
import { organizations } from "./organizations-schema.js";

// Per-organization RBAC -- mirrors features-schema.ts exactly, scoped by
// organizationId. `key` only needs to be unique within an organization,
// not globally (two different orgs can each define their own "invoices.
// view"), so the natural key is (organizationId, key), not `key` alone.
//
// Starts empty for every organization, on purpose, same as the global
// features table's own real rows -- those were never created through a
// live "create feature" UI either, they were seeded via migration as
// real app.* functionality got built (see the RBAC migration's own
// comment). Org-scoped features are meant to follow the same path: a
// future org-scoped feature gets its own migration-seeded row (plus an
// organization_feature_roles grant) when it's actually built, not a
// speculative create-feature form added ahead of any real consumer.
export const organizationFeatures = pgTable(
  "organization_features",
  {
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    label: text("label").notNull(),
    enabled: boolean("enabled").notNull().default(true),
  },
  (table) => [primaryKey({ columns: [table.organizationId, table.key] })],
);
