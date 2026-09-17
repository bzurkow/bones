import { and, eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { db } from "../../db/index.js";
import { organizationRoles, organizationUsers } from "../../db/schema.js";
import { canViewOrg } from "../../organization-permissions.js";
import { protectedProcedure, requireOrganizationPermission, router } from "../trpc.js";

// "admin", "standard", and "viewer" always exist for every organization
// (see organization-roles-schema.ts's own comment) and can never be
// deleted -- same ad hoc-guard style as the global roles.ts's own
// PROTECTED_ROLES.
const PROTECTED_ORGANIZATION_ROLES = new Set(["admin", "standard", "viewer"]);

// Nested under organizationsRouter (trpc.organizations.roles.*), not a
// top-level router -- mirrors roles.ts, scoped to one organization at a
// time via a required organizationId on every input.
export const organizationRolesRouter = router({
  // canViewOrg-gated (member of this org, or the global
  // admin.organizations.update override) -- reading the Roles tab is a
  // view concern, same split every other read on the org detail page
  // uses. Also feeds the Members table's own role control.
  list: protectedProcedure
    .input(z.object({ organizationId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      if (!(await canViewOrg(input.organizationId, ctx.session.user.id, ctx.session.user.role))) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      return db.select().from(organizationRoles).where(eq(organizationRoles.organizationId, input.organizationId));
    }),

  // The Roles tab's own update permission (requireOrganizationPermission)
  // -- the global admin.organizations.update override still works too
  // (canUpdateOrg always checks it first), but a member whose org role
  // has been granted roles.update can create/delete roles without it.
  create: requireOrganizationPermission("roles.update")
    .input(z.object({ organizationId: z.string().min(1), name: z.string().min(1) }))
    .mutation(async ({ input }) => {
      const [existing] = await db
        .select({ name: organizationRoles.name })
        .from(organizationRoles)
        .where(and(eq(organizationRoles.organizationId, input.organizationId), eq(organizationRoles.name, input.name)));
      if (existing) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "A role with that name already exists." });
      }

      const [created] = await db
        .insert(organizationRoles)
        .values({ organizationId: input.organizationId, name: input.name })
        .returning();
      // Deliberately no organization_feature_roles seeding here -- same
      // "a new role starts with zero grants" precedent the global
      // roles.ts's own create uses. An editor grants it access
      // feature-by-feature via the Permissions tab.
      return created;
    }),

  delete: requireOrganizationPermission("roles.update")
    .input(z.object({ organizationId: z.string().min(1), name: z.string().min(1) }))
    .mutation(async ({ input }) => {
      if (PROTECTED_ORGANIZATION_ROLES.has(input.name)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "That role can't be deleted." });
      }

      // Checked explicitly rather than left to organization_users' own FK
      // to reject -- a real constraint violation would still stop this,
      // but with a raw Postgres error instead of a message that actually
      // explains why (same precedent roles.ts's own delete uses).
      const [inUse] = await db
        .select({ userId: organizationUsers.userId })
        .from(organizationUsers)
        .where(and(eq(organizationUsers.organizationId, input.organizationId), eq(organizationUsers.role, input.name)))
        .limit(1);
      if (inUse) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "That role is still assigned to at least one member." });
      }

      // organization_feature_roles rows for this role cascade-delete via
      // that table's own FK (onDelete: "cascade") -- nothing to clean up
      // here by hand.
      const [deleted] = await db
        .delete(organizationRoles)
        .where(and(eq(organizationRoles.organizationId, input.organizationId), eq(organizationRoles.name, input.name)))
        .returning();
      if (!deleted) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Unknown role." });
      }
      return deleted;
    }),
});
