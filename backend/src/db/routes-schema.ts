import { boolean, pgTable, text } from "drizzle-orm/pg-core";

// The umbrella, whole-section gate -- "can this role enter /admin at all"
// (trpc.ts's adminProcedure, App.tsx's RequireAdmin), distinct from
// page_views' per-tab granularity (db/page-views-schema.ts). Split out of
// the general features table it used to live in (as "page.admin.view")
// specifically so a route and the pages within it are two different kinds
// of row, not two features that happen to share a naming convention.
// Only one row exists today ("admin") -- the shape supports more without
// a migration once there's a second top-level authenticated section to
// gate this same way.
export const routes = pgTable("routes", {
  key: text("key").primaryKey(),
  label: text("label").notNull(),
  enabled: boolean("enabled").notNull().default(true),
});
