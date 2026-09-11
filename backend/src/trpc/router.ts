import { router } from "./trpc.js";
import { adminRouter } from "./routers/admin.js";
import { authProtocolsRouter } from "./routers/auth-protocols.js";
import { dbRouter } from "./routers/db.js";
import { featureRolesRouter } from "./routers/feature-roles.js";
import { featuresRouter } from "./routers/features.js";
import { healthRouter } from "./routers/health.js";
import { pageViewRolesRouter } from "./routers/page-view-roles.js";
import { pageViewsRouter } from "./routers/page-views.js";
import { profileRouter } from "./routers/profile.js";
import { rolesRouter } from "./routers/roles.js";
import { routeRolesRouter } from "./routers/route-roles.js";
import { routesRouter } from "./routers/routes.js";
import { termsAndConditionsRouter } from "./routers/terms-and-conditions.js";
import { userSettingsRouter } from "./routers/user-settings.js";

// Alphabetical -- the RBAC table set (roles/features/routes/page_views,
// each with its own -roles join) keeps growing, easier to scan sorted
// than in whatever order each was added.
export const appRouter = router({
  admin: adminRouter,
  authProtocols: authProtocolsRouter,
  db: dbRouter,
  featureRoles: featureRolesRouter,
  features: featuresRouter,
  health: healthRouter,
  pageViewRoles: pageViewRolesRouter,
  pageViews: pageViewsRouter,
  profile: profileRouter,
  roles: rolesRouter,
  routeRoles: routeRolesRouter,
  routes: routesRouter,
  termsAndConditions: termsAndConditionsRouter,
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
export type { AuthProtocolName } from "../auth-protocols.js";
