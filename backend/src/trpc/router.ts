import { router } from "./trpc.js";
import { healthRouter } from "./routers/health.js";
import { dbRouter } from "./routers/db.js";
import { userSettingsRouter } from "./routers/user-settings.js";

export const appRouter = router({
  health: healthRouter,
  db: dbRouter,
  userSettings: userSettingsRouter,
});

export type AppRouter = typeof appRouter;

// Re-exported (type-only -- see backend/package.json's "." export, same
// types-only condition as AppRouter above) so the web app's auth client
// can run better-auth's inferAdditionalFields<typeof auth>() plugin and get
// role/viewMode/etc. properly typed on session.user, instead of the
// unknown-narrowing AuthHelpers used before that existed.
export type { auth } from "../auth.js";

// web-app imports these types from here (type-only) rather than reaching
// into backend's own source layout -- every web-app use of them is
// type-only anyway (see hooks/useColorScheme.ts), so there's nothing more
// than this re-export it needs.
export type { UserRole, ViewMode } from "../user-fields.js";
