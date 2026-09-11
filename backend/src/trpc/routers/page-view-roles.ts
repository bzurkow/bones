import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { db } from "../../db/index.js";
import { pageViewRoles } from "../../db/schema.js";
import { requirePermission, router } from "../trpc.js";

// Reuses feature_roles' own admin.role-permissions.view/update permissions,
// same reasoning as route-roles.ts.
export const pageViewRolesRouter = router({
  listAll: requirePermission("admin.role-permissions.view").query(() => db.select().from(pageViewRoles)),

  setGranted: requirePermission("admin.role-permissions.update")
    .input(z.object({ pageViewKey: z.string(), role: z.string(), granted: z.boolean() }))
    .mutation(async ({ input }) => {
      // Same owner-can't-be-revoked rule as feature-roles.ts/route-roles.ts
      // -- extended to "administrator" too, specifically for page views
      // (an explicit ask, narrower than the features/routes rule): an
      // admin locked out of every admin tab by an accidental uncheck here
      // has no UI left to undo it from, the same self-lockout shape this
      // app's other ad hoc guards already protect against elsewhere.
      if ((input.role === "owner" || input.role === "administrator") && !input.granted) {
        throw new TRPCError({ code: "BAD_REQUEST", message: `${input.role}'s access to a page can't be revoked.` });
      }

      const [row] = await db
        .insert(pageViewRoles)
        .values({ pageViewKey: input.pageViewKey, role: input.role, granted: input.granted })
        .onConflictDoUpdate({
          target: [pageViewRoles.pageViewKey, pageViewRoles.role],
          set: { granted: input.granted },
        })
        .returning();

      return row;
    }),
});
