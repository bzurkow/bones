import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { db } from "../../db/index.js";
import { pageViews } from "../../db/schema.js";
import { hasPermission } from "../../permissions.js";
import { protectedProcedure, requirePermission, router } from "../trpc.js";

// Not admin-creatable, same reasoning as routes.ts -- a page view is a
// real tab wired up in AdminLayout.tsx's own TABS array, not something the
// admin UI spins up on its own. Reuses features' own admin.features.view/
// enable/disable permissions rather than a parallel admin.page-views.* set.
export const pageViewsRouter = router({
  list: requirePermission("admin.features.view").query(() => db.select().from(pageViews)),

  setEnabled: protectedProcedure
    .input(z.object({ key: z.string(), enabled: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const required = input.enabled ? "admin.features.enable" : "admin.features.disable";
      if (!(await hasPermission(ctx.session.user.role, required))) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const [updated] = await db
        .update(pageViews)
        .set({ enabled: input.enabled })
        .where(eq(pageViews.key, input.key))
        .returning();

      if (!updated) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Unknown page view." });
      }

      return updated;
    }),
});
