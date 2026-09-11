import { boolean, pgTable, text } from "drizzle-orm/pg-core";

// The app's real capability list -- both feature-flag (the `enabled`
// column, a global kill switch independent of any role) and RBAC (this
// table is feature_roles' join target) key off the same row, deliberately
// one table rather than two kept in sync. `key` is a stable, code-
// referenced slug (e.g. "admin.users.view" -- see permissions.ts's
// hasPermission and every requirePermission(...) call site), not meant to
// be renamed once created; `label` is the human string an admin actually
// sees (e.g. "Admin > Users > View").
export const features = pgTable("features", {
  key: text("key").primaryKey(),
  label: text("label").notNull(),
  enabled: boolean("enabled").notNull().default(true),
});
