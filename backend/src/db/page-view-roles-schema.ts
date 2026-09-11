import { relations } from "drizzle-orm";
import { boolean, pgTable, primaryKey, text } from "drizzle-orm/pg-core";
import { pageViews } from "./page-views-schema.js";
import { roles } from "./roles-schema.js";

// Join table between page_views and roles -- same boolean-grant shape as
// feature_roles/route_roles, for "does this role see this specific tab."
export const pageViewRoles = pgTable(
  "page_view_roles",
  {
    pageViewKey: text("page_view_key")
      .notNull()
      .references(() => pageViews.key, { onDelete: "cascade" }),
    role: text("role")
      .notNull()
      .references(() => roles.name, { onDelete: "cascade" }),
    granted: boolean("granted").notNull().default(false),
  },
  (table) => [primaryKey({ columns: [table.pageViewKey, table.role] })],
);

export const pageViewRolesRelations = relations(pageViewRoles, ({ one }) => ({
  pageView: one(pageViews, {
    fields: [pageViewRoles.pageViewKey],
    references: [pageViews.key],
  }),
  role: one(roles, {
    fields: [pageViewRoles.role],
    references: [roles.name],
  }),
}));
