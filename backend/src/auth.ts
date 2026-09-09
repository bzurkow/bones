import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { customSession } from "better-auth/plugins";
import { db } from "./db/index.js";
import { users } from "./db/schema.js";
import { getHasAcceptedTermsAndConditions } from "./terms-and-conditions.js";
import { trustedOrigins } from "./trusted-origins.js";
import { USER_ROLES, VIEW_MODES } from "./user-fields.js";
import type { UserRole, ViewMode } from "./user-fields.js";

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
  // Broadens every auth cookie's Domain from host-only (exactly this
  // server's own hostname) to cover subdomains too -- specifically so the
  // OAuth `state` cookie stays valid on both app.localhost:5173 (where
  // vite.config.ts's proxy makes it get set, same-origin) and this
  // server's own bare `localhost` (where Google's OAuth redirect lands
  // directly, unproxied -- see vite.config.ts's comment for why BETTER_AUTH_URL
  // can't just move to app.localhost like the proxy target did). No
  // `domain` given -- defaults to BETTER_AUTH_URL's own hostname
  // ("localhost"), a valid parent domain of app.localhost, so this
  // follows whatever host each environment actually uses.
  advanced: {
    crossSubDomainCookies: { enabled: true },
  },
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
      // Admin-controlled enable/disable, distinct from deletedAt above --
      // suspending an account isn't the same action as deleting it. No API
      // sets this yet either; reserves the column.
      active: {
        type: "boolean",
        required: true,
        input: false,
        defaultValue: true,
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
  plugins: [
    // Adds hasAcceptedTermsAndConditions to every getSession response --
    // whether the currently-active terms-and-conditions row has an
    // accepted acceptance row for this user, or null if there's no active
    // row at all (nothing to have accepted or not). See
    // terms-and-conditions.ts's getHasAcceptedTermsAndConditions.
    customSession(async ({ user, session }) => {
      // customSession's callback param type doesn't carry `user`'s
      // additionalFields (role/viewMode/etc.) even though they're genuinely
      // present at runtime -- a confirmed better-auth limitation
      // (github.com/better-auth/better-auth/issues/3888), not a bug here.
      // Re-typing once, right where the plugin's own Returns generic gets
      // inferred, so the correct shape flows to every downstream consumer
      // of auth.api.getSession() (e.g. trpc/trpc.ts's adminProcedure)
      // instead of every caller needing its own cast.
      const typedUser = user as typeof user & {
        role: UserRole;
        deletedAt: Date | null;
        active: boolean;
        inheritViewModeFromBrowser: boolean;
        viewMode: ViewMode;
      };
      return {
        user: typedUser,
        session,
        hasAcceptedTermsAndConditions: await getHasAcceptedTermsAndConditions(typedUser.id),
      };
    }),
  ],
});
