import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { db } from "../../db/index.js";
import { featureRoles, features } from "../../db/schema.js";
import { hasPermission } from "../../permissions.js";
import { protectedProcedure, requirePermission, router } from "../trpc.js";

export const featuresRouter = router({
  list: requirePermission("admin.features.view").query(() => db.select().from(features)),

  // Enable and disable are two separate permissions in the sketch this was
  // built from (an owner might let an administrator turn a feature off --
  // a kill switch -- without also letting them turn things back on, or
  // vice versa), so which one this checks depends on the direction of the
  // change, not a single static gate. protectedProcedure (not adminProcedure/
  // requirePermission("admin.features.view")) since the actual permission
  // check below is more specific than either.
  setEnabled: protectedProcedure
    .input(z.object({ key: z.string(), enabled: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const required = input.enabled ? "admin.features.enable" : "admin.features.disable";
      if (!(await hasPermission(ctx.session.user.role, required))) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const [updated] = await db.update(features).set({ enabled: input.enabled }).where(eq(features.key, input.key)).returning();

      if (!updated) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Unknown feature." });
      }

      return updated;
    }),

  create: requirePermission("admin.features.create")
    .input(z.object({ key: z.string().min(1), label: z.string().min(1) }))
    .mutation(async ({ input }) => {
      const [existing] = await db.select({ key: features.key }).from(features).where(eq(features.key, input.key));
      if (existing) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "A feature with that key already exists." });
      }

      const [created] = await db.insert(features).values({ key: input.key, label: input.label }).returning();

      // New features start owner-only -- an explicit grant, not a
      // code-level bypass (see permissions.ts's own comment), so a
      // freshly-created feature is actually usable by its creator
      // immediately instead of granted to nobody until someone remembers
      // to visit the permissions grid.
      await db.insert(featureRoles).values({ featureKey: input.key, role: "owner", granted: true });

      return created;
    }),
});
