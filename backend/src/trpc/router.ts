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
