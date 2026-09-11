import { relations } from "drizzle-orm";
import { boolean, pgTable, primaryKey, text } from "drizzle-orm/pg-core";
import { roles } from "./roles-schema.js";
import { routes } from "./routes-schema.js";

// Join table between routes and roles -- same boolean-grant shape as
// feature_roles, just for the coarser "can enter this route at all"
// concept instead of a page-within-a-route or an in-page action.
export const routeRoles = pgTable(
  "route_roles",
  {
    routeKey: text("route_key")
      .notNull()
      .references(() => routes.key, { onDelete: "cascade" }),
    role: text("role")
      .notNull()
      .references(() => roles.name, { onDelete: "cascade" }),
    granted: boolean("granted").notNull().default(false),
  },
  (table) => [primaryKey({ columns: [table.routeKey, table.role] })],
);

export const routeRolesRelations = relations(routeRoles, ({ one }) => ({
  route: one(routes, {
    fields: [routeRoles.routeKey],
    references: [routes.key],
  }),
  role: one(roles, {
    fields: [routeRoles.role],
    references: [roles.name],
  }),
}));
