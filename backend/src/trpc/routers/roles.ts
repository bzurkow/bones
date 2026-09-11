import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { db } from "../../db/index.js";
import { roles, users } from "../../db/schema.js";
import { protectedProcedure, requirePermission, router } from "../trpc.js";

// Roles never had FK-worthy or otherwise sensitive names, so listing them
// needs no permission of its own beyond being signed in -- AdminUsers.tsx's
// role dropdown, AdminRoles.tsx, and AdminPermissions.tsx's grid columns
// all read from here, and none of those consumers share one single
// feature-permission gate that'd make sense to hang this behind instead.
const PROTECTED_ROLES = new Set(["owner", "standard"]);

export const rolesRouter = router({
  list: protectedProcedure.query(() => db.select().from(roles)),

  create: requirePermission("admin.roles.create")
    .input(z.object({ name: z.string().min(1) }))
    .mutation(async ({ input }) => {
      const [existing] = await db.select({ name: roles.name }).from(roles).where(eq(roles.name, input.name));
      if (existing) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "A role with that name already exists." });
      }

      const [created] = await db.insert(roles).values({ name: input.name }).returning();
      // Deliberately no feature_roles seeding here -- a new role starts
      // with zero grants, same as "standard" today (which has no rows at
      // all in feature_roles), not copied from any existing role. An
      // owner grants it access feature-by-feature via AdminPermissions.tsx.
      return created;
    }),

  delete: requirePermission("admin.roles.delete")
    .input(z.object({ name: z.string() }))
    .mutation(async ({ input }) => {
      // "owner" and "standard" are permanently undeletable -- owner is the
      // bootstrap-privilege role, standard is auth.ts's nextUserRole's
      // hardcoded fallback for every signup after the first. Hardcoded
      // check, same ad hoc-guard style as this app's other self-lockout-
      // style protections (admin.ts's setUserRole/setUserActive,
      // auth-protocols.ts's "can't disable the last enabled method").
      if (PROTECTED_ROLES.has(input.name)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "That role can't be deleted." });
      }

      // Checked explicitly rather than left to the users.role FK to reject
      // -- a real constraint violation would still stop this, but with a
      // raw Postgres error instead of a message that actually explains why.
      const [inUse] = await db.select({ id: users.id }).from(users).where(eq(users.role, input.name)).limit(1);
      if (inUse) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "That role is still assigned to at least one user." });
      }

      // feature_roles rows for this role cascade-delete via that table's
      // own FK (onDelete: "cascade") -- nothing to clean up here by hand.
      const [deleted] = await db.delete(roles).where(eq(roles.name, input.name)).returning();
      if (!deleted) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Unknown role." });
      }

      return deleted;
    }),
});
