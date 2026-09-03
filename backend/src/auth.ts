import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "./db/index.js";
import { users } from "./db/schema.js";
import { trustedOrigins } from "./trusted-origins.js";
import { USER_ROLES, VIEW_MODES } from "./user-fields.js";
import type { UserRole } from "./user-fields.js";

// Pure decision logic pulled out of the databaseHooks.user.create.before
// hook below so it's directly unit-testable (auth.test.ts) without a DB.
export function nextUserRole(hasExistingUsers: boolean): UserRole {
  return hasExistingUsers ? "standard" : "owner";
}

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg", usePlural: true }),
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  trustedOrigins,
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },
  user: {
    additionalFields: {
      // Assigned server-side only (see databaseHooks below) -- input: false
      // keeps it out of the client-facing sign-up payload entirely, so
      // there's no role a client could self-assign.
      role: {
        type: [...USER_ROLES],
        required: true,
        input: false,
        defaultValue: "standard",
      },
      // Soft delete: null/unset means active. No API sets this yet --
      // that's future work -- this just reserves the column.
      deletedAt: {
        type: "date",
        required: false,
        input: false,
      },
      // View-mode preference. input: false for the same reason as role --
      // better-auth's own updateUser endpoint accepts any additionalField
      // marked input: true, which would let a client PATCH these with no
      // validation of its own; trpc/routers/user-settings.ts's
      // updateUserSettings is the only writer, and it's already scoped to
      // the caller's own row.
      inheritViewModeFromBrowser: {
        type: "boolean",
        required: true,
        input: false,
        defaultValue: true,
      },
      viewMode: {
        type: [...VIEW_MODES],
        required: true,
        input: false,
        defaultValue: "light",
      },
    },
  },
  // The very first user to ever sign up becomes the Owner; everyone after
  // that starts as a Standard user (role's defaultValue above). Checked
  // here rather than relying on defaultValue alone, since defaultValue is a
  // single static value and can't express "only for the first row".
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          const [existing] = await db.select({ id: users.id }).from(users).limit(1);
          return { data: { ...user, role: nextUserRole(Boolean(existing)) } };
        },
      },
    },
  },
});
