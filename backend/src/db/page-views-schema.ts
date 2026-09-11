import { boolean, pgTable, text } from "drizzle-orm/pg-core";
import { routes } from "./routes-schema.js";

// Per-tab visibility WITHIN a route (e.g. the Users/Permissions/Roles/
// Site Settings/Terms tabs inside the "admin" route) -- distinct from
// routes.ts's own umbrella gate. Split out of the general features table
// (where these lived as "page.admin.<tab>") for the same reason routes
// was: a page-within-a-route is a different kind of row than an in-page
// action permission, not just a naming convention on the same table.
// `routeKey` ties each page view to the route it belongs to -- keys stay
// route-qualified anyway (e.g. "admin.users") to avoid a future
// same-named tab under a different route colliding on this table's PK.
export const pageViews = pgTable("page_views", {
  key: text("key").primaryKey(),
  routeKey: text("route_key")
    .notNull()
    .references(() => routes.key, { onDelete: "cascade" }),
  label: text("label").notNull(),
  enabled: boolean("enabled").notNull().default(true),
});
