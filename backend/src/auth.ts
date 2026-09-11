import { APIError, betterAuth } from "better-auth";
import { createAuthMiddleware } from "better-auth/api";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { customSession } from "better-auth/plugins";
import { isAuthProtocolEnabled } from "./auth-protocols.js";
import { db } from "./db/index.js";
import { users } from "./db/schema.js";
import { sendEmail } from "./email/index.js";
import { renderVerificationEmail } from "./email/templates.js";
import { getEnabledFeatures } from "./permissions.js";
import { resolveAvatarUrl } from "./storage/index.js";
import { getHasAcceptedTermsAndConditions } from "./terms-and-conditions.js";
import { trustedOrigins } from "./trusted-origins.js";
import { VIEW_MODES } from "./user-fields.js";
import type { UserRole, ViewMode } from "./user-fields.js";

// Pure decision logic pulled out of the databaseHooks.user.create.before
// hook below so it's directly unit-testable (auth.test.ts) without a DB.
export function nextUserRole(hasExistingUsers: boolean): UserRole {
  return hasExistingUsers ? "standard" : "owner";
}

// Better Auth's own minPasswordLength/maxPasswordLength (set below) only
// gate length -- there's no built-in complexity option, so that half of
// the rule lives here as a plain regex: at least one letter, one digit, one
// special character. Exported (and unit-tested in auth.test.ts) the same
// way nextUserRole is. Mirrored client-side in
// web-app/src/AuthHelpers/password-rules.ts for instant validation before
// a request ever goes out -- backend can't export runtime code to web-app
// (this package's own exports are types-only, see package.json), so this
// gets duplicated rather than shared; keep both in sync if either changes.
export const PASSWORD_RULES_MESSAGE = "Password must be at least 8 characters and include a letter, a number, and a special character.";

export function isStrongPassword(password: string): boolean {
  return password.length >= 8 && /[a-zA-Z]/.test(password) && /[0-9]/.test(password) && /[^a-zA-Z0-9]/.test(password);
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
  // Hashing is Better Auth's own default (node:crypto scrypt -- a
  // memory-hard KDF; see node_modules/better-auth/dist/crypto/password.mjs),
  // not overridden here. minPasswordLength/maxPasswordLength is the length
  // half of the password rule; the complexity half (letter + digit +
  // special character) is enforced below in hooks.before, since Better
  // Auth has no built-in option for that.
  //
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    // Email-sending infrastructure now exists (see email/index.ts -- Amazon
    // SES in production, Mailpit in dev), so this can require verification
    // instead of trusting whatever address a sign-up form was given.
    requireEmailVerification: true,
  },
  // sendVerificationEmail builds the actual message; the three trigger
  // flags below are the policy for when Better Auth calls it.
  // autoSignInAfterVerification: clicking the email link signs the user in
  // directly rather than dropping them back at /login having "verified"
  // but not "signed in." sendOnSignUp defaults to requireEmailVerification's
  // value anyway (Better Auth's own fallback) but is spelled out here since
  // it's the whole point of turning requireEmailVerification on.
  // sendOnSignIn re-sends a fresh link if someone tries to sign in before
  // verifying -- their first email may be long gone by then.
  emailVerification: {
    sendVerificationEmail: async ({ user, url }) => {
      await sendEmail(user.email, "Verify your email", await renderVerificationEmail(url));
    },
    sendOnSignUp: true,
    sendOnSignIn: true,
    autoSignInAfterVerification: true,
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },
  // Password complexity (length is covered by minPasswordLength above).
  // Only /sign-up/email carries a fresh plaintext password to check --
  // sign-in verifies against an existing hash, not this rule. There's still
  // no password-reset flow (separate roadmap item, unrelated to email
  // verification above -- email infra now exists for either).
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      // Gate 1: is this sign-in method even turned on? Checked first, and
      // for both sign-up and sign-in -- disabling "google" here blocks an
      // already-registered Google user from signing back in too, not just
      // new sign-ups, same as the admin panel's "Authorization Protocols"
      // toggle implies. web-app's Login/SignUp pages also hide the
      // corresponding UI entirely once auth-protocols.list says it's off,
      // but this server-side check is the actual enforcement -- that UI
      // hiding is just not showing a button that would fail anyway.
      if (ctx.path === "/sign-up/email" || ctx.path === "/sign-in/email") {
        if (!(await isAuthProtocolEnabled("email"))) {
          throw new APIError("FORBIDDEN", { message: "Email sign-in is currently disabled." });
        }
      }
      if (ctx.path === "/sign-in/social" && ctx.body?.provider === "google") {
        if (!(await isAuthProtocolEnabled("google"))) {
          throw new APIError("FORBIDDEN", { message: "Google sign-in is currently disabled." });
        }
      }

      // Gate 2: password strength, sign-up only (sign-in verifies against
      // an existing hash, not this rule).
      if (ctx.path !== "/sign-up/email") return;
      const password = typeof ctx.body?.password === "string" ? ctx.body.password : "";
      if (!isStrongPassword(password)) {
        throw new APIError("BAD_REQUEST", { message: PASSWORD_RULES_MESSAGE });
      }
    }),
  },
  user: {
    additionalFields: {
      // Assigned server-side only (see databaseHooks below) -- input: false
      // keeps it out of the client-facing sign-up payload entirely, so
      // there's no role a client could self-assign.
      //
      // Plain "string", not a fixed enum -- roles are admin-creatable/
      // deletable at runtime (db/roles-schema.ts), so a static array here
      // would reject any newly-created role the moment someone tried to
      // assign it. Real validation is a DB-level FK from this column onto
      // roles.name instead (added by hand in that table's own migration,
      // since this file can't declare it without db:auth:generate wiping
      // it on the next run).
      role: {
        type: "string",
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
      // Whether the floating light/dark toggle (ColorSchemeToggle.tsx)
      // renders for this user at all -- per-user, not the site-wide
      // show/hide originally sketched in bones-roadmap-notes.md item 19
      // (there's no AdminSiteSettings backing yet to hang that on, and a
      // per-user preference is a smaller, more direct fit for "I don't
      // want to see this button" than an admin-controlled site setting
      // would be). input: false for the same reason as viewMode above --
      // user-settings.ts's updateUserSettings is the only writer.
      showViewModeToggle: {
        type: "boolean",
        required: true,
        input: false,
        defaultValue: true,
      },
      // Whether the "view as role" floating toggle (ViewAsRoleToggle.tsx)
      // renders for this user -- only ever true for an "owner" role to
      // begin with (that gate is hardcoded, not permission-table-driven,
      // since the toggle is the tool for *previewing* the permission
      // table), same per-user show/hide precedent as showViewModeToggle
      // above. input: false for the same reason as that field --
      // user-settings.ts's updateUserSettings is the only writer.
      showViewAsRoleToggle: {
        type: "boolean",
        required: true,
        input: false,
        defaultValue: true,
      },
      // Stores an S3 object *key*, not a real URL (despite the name --
      // matches terms-and-conditions.assetUrl's same convention), resolved
      // into a real presigned GET URL below in customSession. input: false
      // for the same reason as role/viewMode: only
      // trpc/routers/profile.ts's confirmAvatarUpload can set this, never
      // an arbitrary client-supplied URL via updateUser.
      avatarUrl: {
        type: "string",
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
        showViewModeToggle: boolean;
        showViewAsRoleToggle: boolean;
        avatarUrl: string | null;
      };
      // typedUser.avatarUrl as stored on the row is an S3 *key* (see the
      // additionalFields comment above), not a working URL -- resolved into
      // a real presigned GET URL here, once, and the field is overwritten
      // in place on the returned user so every useSession()/getSession()
      // caller (TopBar, ApplicationProfile, ...) just reads
      // session.user.avatarUrl and gets a real URL for free, same reasoning
      // as hasAcceptedTermsAndConditions below being resolved centrally
      // rather than per-caller. Stays null when no avatar has been
      // uploaded yet -- callers fall back to the native `image` field
      // (Google's profile picture) in that case.
      return {
        user: { ...typedUser, avatarUrl: await resolveAvatarUrl(typedUser.avatarUrl) },
        session,
        hasAcceptedTermsAndConditions: await getHasAcceptedTermsAndConditions(typedUser.id),
        // Every feature key this session's role currently has access to
        // (features.enabled + feature_roles.granted, see permissions.ts's
        // getEnabledFeatures) -- lets web-app render or redirect a
        // page/button without a round trip per check. Resolved centrally
        // here for the same reason hasAcceptedTermsAndConditions is.
        enabledFeatures: await getEnabledFeatures(typedUser.role),
      };
    }),
  ],
});
