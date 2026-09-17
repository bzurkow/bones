import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { db } from "../../db/index.js";
import { organizationFeatureRoles } from "../../db/schema.js";
import { canViewOrg } from "../../organization-permissions.js";
import { protectedProcedure, requireOrganizationPermission, router } from "../trpc.js";

// Nested under organizationsRouter (trpc.organizations.featureRoles.*),
// not a top-level router -- mirrors feature-roles.ts, scoped to one
// organization at a time.
export const organizationFeatureRolesRouter = router({
  // canViewOrg-gated (member of this org, or the global
  // admin.organizations.update override) -- feeds the Permissions tab's
  // grid.
  listAll: protectedProcedure
    .input(z.object({ organizationId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      if (!(await canViewOrg(input.organizationId, ctx.session.user.id, ctx.session.user.role))) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      return db.select().from(organizationFeatureRoles).where(eq(organizationFeatureRoles.organizationId, input.organizationId));
    }),

  // The Permissions tab's own update permission -- the global
  // admin.organizations.update override still works too. "Org admin must
  // have all update permissions in the organization. These cannot be
  // removed" -- same "owner's grant, once true, can never be unchecked"
  // guard the global feature-roles.ts's own setGranted has, just for
  // "admin" instead of "owner" (there's no per-feature carve-out: this
  // blocks revoking *any* grant of this org's "admin" role, not just the
  // four built-in tab-update ones, matching the global guard's own
  // blanket scope).
  setGranted: requireOrganizationPermission("permissions.update")
    .input(
      z.object({
        organizationId: z.string().min(1),
        featureKey: z.string().min(1),
        role: z.string().min(1),
        granted: z.boolean(),
      }),
    )
    .mutation(async ({ input }) => {
      if (input.role === "admin" && !input.granted) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "The admin role's grants can't be revoked." });
      }

      const [updated] = await db
        .insert(organizationFeatureRoles)
        .values({
          organizationId: input.organizationId,
          featureKey: input.featureKey,
          role: input.role,
          granted: input.granted,
        })
        .onConflictDoUpdate({
          target: [organizationFeatureRoles.organizationId, organizationFeatureRoles.featureKey, organizationFeatureRoles.role],
          set: { granted: input.granted },
        })
        .returning();
      return updated;
    }),
});
