import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "./db/index.js";
import { users } from "./db/schema.js";
import { trustedOrigins } from "./trusted-origins.js";

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
        type: ["owner", "administrator", "standard"],
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
          return { data: { ...user, role: existing ? "standard" : "owner" } };
        },
      },
    },
  },
});
