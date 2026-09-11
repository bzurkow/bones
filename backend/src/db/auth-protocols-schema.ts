import { boolean, pgTable, text } from "drizzle-orm/pg-core";

// Which sign-in methods are currently allowed -- checked by auth.ts's hooks
// on every /sign-up/email, /sign-in/email, and /sign-in/social(google)
// request, and by web-app's Login/SignUp pages to decide which auth UI to
// even render. `name` is the natural primary key -- no reason for a
// meaningless surrogate id alongside it. Seeded by its own migration
// (0010_motionless_mimic.sql), not app-boot logic -- see that migration's
// comment.
//
// The enum literal is hand-duplicated from auth-protocols.ts's
// AUTH_PROTOCOLS rather than imported -- this file is what that module's
// own `authProtocols` import ultimately comes from (via db/schema.ts), so
// importing back would be circular. Same duplication precedent as
// auth-schema.ts's `role` column, which hardcodes USER_ROLES' literal
// values for the same reason (that file is codegen'd and can't import
// application code at all).
export const authProtocols = pgTable("auth_protocols", {
  name: text("name", { enum: ["email", "google"] }).primaryKey(),
  enabled: boolean("enabled").notNull().default(false),
});
