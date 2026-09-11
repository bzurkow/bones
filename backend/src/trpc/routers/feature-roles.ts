import { z } from "zod";
import { db } from "../../db/index.js";
import { featureRoles } from "../../db/schema.js";
import { requirePermission, router } from "../trpc.js";

export const featureRolesRouter = router({
  // Used by AdminPermissions.tsx's grid (every feature x every role, all
  // at once) -- needs the full matrix, not one row at a time.
  listAll: requirePermission("admin.role-permissions.view").query(() => db.select().from(featureRoles)),

  // Upsert, not a plain update -- a (feature, role) pair with no row at
  // all is a valid, common starting state (a missing row means "not
  // granted," see permissions.ts's hasPermission), so toggling it on for
  // the first time has nothing to UPDATE yet.
  setGranted: requirePermission("admin.role-permissions.update")
    .input(z.object({ featureKey: z.string(), role: z.string(), granted: z.boolean() }))
    .mutation(async ({ input }) => {
      const [row] = await db
        .insert(featureRoles)
        .values({ featureKey: input.featureKey, role: input.role, granted: input.granted })
        .onConflictDoUpdate({
          target: [featureRoles.featureKey, featureRoles.role],
          set: { granted: input.granted },
        })
        .returning();

      return row;
    }),
});
