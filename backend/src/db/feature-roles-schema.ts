import { relations } from "drizzle-orm";
import { boolean, pgTable, primaryKey, text } from "drizzle-orm/pg-core";
import { features } from "./features-schema.js";
import { roles } from "./roles-schema.js";

// Join table between features and roles -- one row per (feature, role)
// pair, `granted` is a plain boolean (not a none/read/write level):
// granularity comes from defining many narrow features ("Update Owner" vs.
// "Update Role" as separate rows), not a tri-state on one coarse feature.
// A missing row means "not granted" (see permissions.ts's hasPermission --
// fails closed), so only pairs that are actually granted or explicitly
// revoked-after-being-granted need a row at all. Composite primary key,
// same reasoning as user_terms_and_conditions' own (feature, role) is the
// only thing that could meaningfully identify a row here.
export const featureRoles = pgTable(
  "feature_roles",
  {
    featureKey: text("feature_key")
      .notNull()
      .references(() => features.key, { onDelete: "cascade" }),
    role: text("role")
      .notNull()
      .references(() => roles.name, { onDelete: "cascade" }),
    granted: boolean("granted").notNull().default(false),
  },
  (table) => [primaryKey({ columns: [table.featureKey, table.role] })],
);

export const featureRolesRelations = relations(featureRoles, ({ one }) => ({
  feature: one(features, {
    fields: [featureRoles.featureKey],
    references: [features.key],
  }),
  role: one(roles, {
    fields: [featureRoles.role],
    references: [roles.name],
  }),
}));
