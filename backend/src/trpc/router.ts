import { router } from "./trpc.js";
import { healthRouter } from "./routers/health.js";
import { dbRouter } from "./routers/db.js";

export const appRouter = router({
  health: healthRouter,
  db: dbRouter,
});

export type AppRouter = typeof appRouter;
