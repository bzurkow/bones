import { pgTable, text } from "drizzle-orm/pg-core";

// The full set of roles a user can have -- replaces the old hardcoded
// USER_ROLES TypeScript union (backend/src/user-fields.ts, now retired).
// Admin-creatable/deletable via trpc/routers/roles.ts, not a fixed set:
// `name` is the natural primary key -- no reason for a meaningless
// surrogate id alongside it, and it's what users.role actually stores.
//
// users.role itself can't declare a real .references() onto this table --
// that column lives in auth-schema.ts, a Better Auth-generated file that
// would just get overwritten on the next `db:auth:generate` run. The FK is
// added as a hand-written ALTER TABLE in this table's own migration
// instead (see that migration's comment) -- real DB-level integrity
// without ever touching the generated file.
//
// "owner" and "standard" are permanently undeletable (roles.ts's `delete`
// procedure hardcodes this, the same ad hoc-guard style as the rest of
// this app's role/permission checks) -- owner is the bootstrap-privilege
// role, standard is auth.ts's nextUserRole's hardcoded fallback for every
// signup after the first. Neither can ever end up missing without
// breaking those two invariants.
export const roles = pgTable("roles", {
  name: text("name").primaryKey(),
});
