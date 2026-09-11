import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { db } from "../../db/index.js";
import { routeRoles } from "../../db/schema.js";
import { requirePermission, router } from "../trpc.js";

// Reuses feature_roles' own admin.role-permissions.view/update permissions
// -- granting/revoking access to a route is the same kind of admin action
// as granting/revoking a feature, not a separate governed surface.
export const routeRolesRouter = router({
  listAll: requirePermission("admin.role-permissions.view").query(() => db.select().from(routeRoles)),

  setGranted: requirePermission("admin.role-permissions.update")
    .input(z.object({ routeKey: z.string(), role: z.string(), granted: z.boolean() }))
    .mutation(async ({ input }) => {
      // Owner's route access, once granted, can never be revoked --
      // revoking "admin" specifically would lock every owner out of the
      // entire admin area with no way back in, an even sharper version of
      // the same rule feature-roles.ts's setGranted already enforces.
      if (input.role === "owner" && !input.granted) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Owner's access to a route can't be revoked." });
      }

      const [row] = await db
        .insert(routeRoles)
        .values({ routeKey: input.routeKey, role: input.role, granted: input.granted })
        .onConflictDoUpdate({
          target: [routeRoles.routeKey, routeRoles.role],
          set: { granted: input.granted },
        })
        .returning();

      return row;
    }),
});
