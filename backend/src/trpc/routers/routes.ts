import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { db } from "../../db/index.js";
import { routes } from "../../db/schema.js";
import { hasPermission } from "../../permissions.js";
import { protectedProcedure, requirePermission, router } from "../trpc.js";

// Not admin-creatable like features/roles -- a route is a real
// authenticated section of the app (registering a new one is a code
// change, App.tsx's route tree), not something that makes sense to spin up
// purely from the admin UI. Reuses features' own admin.features.view/
// enable/disable permissions rather than adding a parallel admin.routes.*
// set nobody asked for -- from an admin's perspective, managing what's
// enabled here is the same kind of action as managing a feature.
export const routesRouter = router({
  list: requirePermission("admin.features.view").query(() => db.select().from(routes)),

  setEnabled: protectedProcedure
    .input(z.object({ key: z.string(), enabled: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const required = input.enabled ? "admin.features.enable" : "admin.features.disable";
      if (!(await hasPermission(ctx.session.user.role, required))) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const [updated] = await db.update(routes).set({ enabled: input.enabled }).where(eq(routes.key, input.key)).returning();

      if (!updated) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Unknown route." });
      }

      return updated;
    }),
});
