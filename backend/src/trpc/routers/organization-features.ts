import { and, eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { db } from "../../db/index.js";
import { organizationFeatures } from "../../db/schema.js";
import { canViewOrg } from "../../organization-permissions.js";
import { protectedProcedure, requireOrganizationPermission, router } from "../trpc.js";

// Nested under organizationsRouter (trpc.organizations.features.*), not a
// top-level router -- mirrors features.ts, scoped to one organization at
// a time. No `create` here, unlike the global router: an org-scoped
// feature is meant to be added the same way the global ones were (a
// migration-seeded row, once real org-scoped app.* functionality actually
// needs gating), not through a live create-feature form with no consumer
// yet -- see organization-features-schema.ts's own comment.
export const organizationFeaturesRouter = router({
  // canViewOrg-gated (member of this org, or the global
  // admin.organizations.update override) -- reading the Permissions tab
  // is a view concern, same split every other read on the org detail
  // page uses.
  list: protectedProcedure
    .input(z.object({ organizationId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      if (!(await canViewOrg(input.organizationId, ctx.session.user.id, ctx.session.user.role))) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      return db.select().from(organizationFeatures).where(eq(organizationFeatures.organizationId, input.organizationId));
    }),

  // The Permissions tab's own update permission -- one gate, not the
  // global features.ts's own enable/disable split (no org-scoped
  // equivalent of that split).
  setEnabled: requireOrganizationPermission("permissions.update")
    .input(z.object({ organizationId: z.string().min(1), key: z.string().min(1), enabled: z.boolean() }))
    .mutation(async ({ input }) => {
      const [updated] = await db
        .update(organizationFeatures)
        .set({ enabled: input.enabled })
        .where(and(eq(organizationFeatures.organizationId, input.organizationId), eq(organizationFeatures.key, input.key)))
        .returning();
      if (!updated) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Unknown feature." });
      }
      return updated;
    }),
});
