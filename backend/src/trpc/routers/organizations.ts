import { and, count, eq, ilike, notInArray, or } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { ORGANIZATION_MEMBER_ROLES } from "../../db/organization-users-schema.js";
import { db } from "../../db/index.js";
import { organizationUsers, organizations, users } from "../../db/schema.js";
import { requirePermission, router } from "../trpc.js";

const memberRole = z.enum(ORGANIZATION_MEMBER_ROLES);

export const organizationsRouter = router({
  // admin.organizations.view, not merely protectedProcedure -- unlike
  // roles.ts's own list (nothing sensitive, no permission of its own),
  // Organizations has a real, explicit view permission (see the seed
  // migration's comment for why: reaching the tab at all needs
  // page.admin.organizations, but a role can have that without also
  // having admin.organizations.view, same "reach the tab, still get
  // FORBIDDEN" shape as AdminUsers.tsx's own admin.users.view).
  //
  // memberCount is a LEFT JOIN + count, not a per-row subquery -- one
  // query for the whole table (AdminOrganizations.tsx's own Table needs
  // it for every row), grouped by organization so an org with zero members
  // still gets a row (LEFT, not INNER).
  list: requirePermission("admin.organizations.view").query(() =>
    db
      .select({
        id: organizations.id,
        name: organizations.name,
        blurb: organizations.blurb,
        active: organizations.active,
        memberCount: count(organizationUsers.userId),
      })
      .from(organizations)
      .leftJoin(organizationUsers, eq(organizationUsers.organizationId, organizations.id))
      .groupBy(organizations.id),
  ),

  // Users matched by name/email, for the Create modal's initial-admin
  // picker -- no organizationId yet (the org doesn't exist until this
  // form submits), unlike searchAddableUsers below. Gated by
  // application.organizations.create (the same permission the actual
  // create action needs), not admin.users.view -- picking an initial
  // admin shouldn't require a whole separate admin-users permission just
  // because it happens to search the same table.
  searchUsers: requirePermission("application.organizations.create")
    .input(z.object({ search: z.string().min(1) }))
    .query(({ input }) =>
      db
        .select({ id: users.id, name: users.name, email: users.email })
        .from(users)
        .where(or(ilike(users.name, `%${input.search}%`), ilike(users.email, `%${input.search}%`)))
        .limit(10),
    ),

  // application.organizations.create, not an admin.organizations.create --
  // that key deliberately doesn't exist (see the seed migration's
  // comment). Creating an organization is an application-level action;
  // the admin tab is currently the only surface that calls this, but the
  // permission gating it isn't admin-specific.
  //
  // Every organization must have an initial admin from the moment it
  // exists -- inserted in the same transaction as the organization row
  // itself, not a separate follow-up call, so there's never a window where
  // the org exists with zero members.
  create: requirePermission("application.organizations.create")
    .input(
      z.object({
        name: z.string().min(1),
        blurb: z.string().default(""),
        initialAdminUserId: z.string().min(1),
      }),
    )
    .mutation(async ({ input }) => {
      const [admin] = await db.select({ id: users.id }).from(users).where(eq(users.id, input.initialAdminUserId));
      if (!admin) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "That user doesn't exist." });
      }

      return db.transaction(async (tx) => {
        const [created] = await tx
          .insert(organizations)
          .values({ id: crypto.randomUUID(), name: input.name, blurb: input.blurb })
          .returning();
        if (!created) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Couldn't create that organization." });
        }

        await tx.insert(organizationUsers).values({
          organizationId: created.id,
          userId: input.initialAdminUserId,
          role: "admin",
        });

        return created;
      });
    }),

  // Name/blurb only -- active has its own procedure below (setActive),
  // same split as admin.ts's setUserRole/setUserActive: a settings-gear
  // confirm-modal action reads as a different kind of change than a plain
  // form field, even though both ultimately set a column on this table.
  update: requirePermission("admin.organizations.update")
    .input(
      z.object({
        id: z.string().min(1),
        name: z.string().min(1),
        blurb: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      const [updated] = await db
        .update(organizations)
        .set({ name: input.name, blurb: input.blurb })
        .where(eq(organizations.id, input.id))
        .returning();

      if (!updated) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Unknown organization." });
      }

      return updated;
    }),

  // The settings-gear confirm-modal action -- see update's own comment for
  // why this is separate.
  setActive: requirePermission("admin.organizations.update")
    .input(z.object({ id: z.string().min(1), active: z.boolean() }))
    .mutation(async ({ input }) => {
      const [updated] = await db
        .update(organizations)
        .set({ active: input.active })
        .where(eq(organizations.id, input.id))
        .returning();

      if (!updated) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Unknown organization." });
      }

      return updated;
    }),

  // Membership management -- the "extending" this feature started from
  // (organization_users existed from the start, unused until now). No
  // permission key of its own: reusing admin.organizations.view/.update,
  // same split as everything else on this router -- seeing who's a member
  // is a view concern, adding/removing/re-rolling one is an update
  // concern, matching the Admin tab's own Members modal (view-gated to
  // open, update-gated to actually change anything inside it).
  listMembers: requirePermission("admin.organizations.view")
    .input(z.object({ organizationId: z.string().min(1) }))
    .query(({ input }) =>
      db
        .select({ id: users.id, name: users.name, email: users.email, role: organizationUsers.role })
        .from(organizationUsers)
        .innerJoin(users, eq(organizationUsers.userId, users.id))
        .where(eq(organizationUsers.organizationId, input.organizationId)),
    ),

  // Users not already a member, matched by name/email -- feeds the Members
  // modal's "add someone" search. Capped at 10: a picker, not a paginated
  // table (AdminUsers.tsx's own Table is that, for the full user list).
  searchAddableUsers: requirePermission("admin.organizations.update")
    .input(z.object({ organizationId: z.string().min(1), search: z.string().min(1) }))
    .query(async ({ input }) => {
      const memberRows = await db
        .select({ userId: organizationUsers.userId })
        .from(organizationUsers)
        .where(eq(organizationUsers.organizationId, input.organizationId));
      const memberIds = memberRows.map((row) => row.userId);

      return db
        .select({ id: users.id, name: users.name, email: users.email })
        .from(users)
        .where(
          and(
            or(ilike(users.name, `%${input.search}%`), ilike(users.email, `%${input.search}%`)),
            // notInArray on an empty list would produce `NOT IN ()`, which
            // Drizzle/Postgres don't accept -- skip the exclusion entirely
            // when the org has no members yet rather than special-casing
            // the query shape.
            memberIds.length > 0 ? notInArray(users.id, memberIds) : undefined,
          ),
        )
        .limit(10);
    }),

  // New members always start "standard" -- promoting one to "admin" is a
  // separate, explicit setMemberRole call below (the Members list's own
  // role dropdown), not an option exposed in the add-picker itself. Keeps
  // the add flow a single click; a freshly-added member is never
  // accidentally granted admin standing.
  addMember: requirePermission("admin.organizations.update")
    .input(z.object({ organizationId: z.string().min(1), userId: z.string().min(1) }))
    .mutation(async ({ input }) => {
      // onConflictDoNothing, not a pre-check -- the composite PK already
      // guarantees no duplicate row; this just makes a double-click (the
      // add button firing twice before the row list refreshes) a no-op
      // instead of a raw constraint-violation error.
      await db
        .insert(organizationUsers)
        .values({ organizationId: input.organizationId, userId: input.userId, role: "standard" })
        .onConflictDoNothing();
      return { organizationId: input.organizationId, userId: input.userId };
    }),

  removeMember: requirePermission("admin.organizations.update")
    .input(z.object({ organizationId: z.string().min(1), userId: z.string().min(1) }))
    .mutation(async ({ input }) => {
      await db
        .delete(organizationUsers)
        .where(and(eq(organizationUsers.organizationId, input.organizationId), eq(organizationUsers.userId, input.userId)));
      return { organizationId: input.organizationId, userId: input.userId };
    }),

  // No "can't demote the last admin" guard yet -- a real gap (see
  // organization-users-schema.ts's own comment), not enforced this pass.
  setMemberRole: requirePermission("admin.organizations.update")
    .input(z.object({ organizationId: z.string().min(1), userId: z.string().min(1), role: memberRole }))
    .mutation(async ({ input }) => {
      const [updated] = await db
        .update(organizationUsers)
        .set({ role: input.role })
        .where(and(eq(organizationUsers.organizationId, input.organizationId), eq(organizationUsers.userId, input.userId)))
        .returning();

      if (!updated) {
        throw new TRPCError({ code: "NOT_FOUND", message: "That user isn't a member of this organization." });
      }

      return updated;
    }),
});
