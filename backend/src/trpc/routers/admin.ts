import { asc, count, desc, eq, ilike, inArray, or } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import type { AuthProtocolName } from "../../auth-protocols.js";
import { db } from "../../db/index.js";
import { accounts, roles, users } from "../../db/schema.js";
import { hasPermission } from "../../permissions.js";
import { resolveAvatarUrl } from "../../storage/index.js";
import { protectedProcedure, requirePermission, router } from "../trpc.js";

// better-auth's own provider id for email+password specifically -- not
// "email" (confirmed in node_modules/better-auth/dist/api/routes/sign-up.mjs's
// internalAdapter.linkAccount call), so this maps it to the name
// auth-protocols.ts's AUTH_PROTOCOLS actually uses everywhere else in this
// app. Every other providerId (currently just "google") already matches an
// AuthProtocolName as-is.
const PROVIDER_TO_PROTOCOL: Record<string, AuthProtocolName> = {
  credential: "email",
  google: "google",
};

// Allowlist, not a raw column-name lookup straight from client input --
// both for safety (an unvalidated column name straight into orderBy is a
// bad shape regardless of ORM-level injection safety) and because this is
// the seam a future calculated column (a value with no single backing DB
// column) would extend: it'd stay out of this map -- and therefore
// unsortable -- until sort support for it is specifically built, at which
// point this map gains a case for it. The Table component's own API
// (web-app/src/components/Table -- an opaque `enableSort`/sort-key string)
// doesn't need to change at all for that later.
const SORTABLE_COLUMNS = {
  name: users.name,
  email: users.email,
  role: users.role,
  active: users.active,
  createdAt: users.createdAt,
} as const;

const sortKeys = Object.keys(SORTABLE_COLUMNS) as [keyof typeof SORTABLE_COLUMNS, ...(keyof typeof SORTABLE_COLUMNS)[]];

export const adminRouter = router({
  // Paginated + server-side searched/sorted -- once a real page is fetched
  // at a time (not the whole table), both search and sort have to happen
  // server-side too, or they'd only ever apply to whatever page happened
  // to already be loaded. See NOTES.md for the fuller reasoning.
  listUsers: requirePermission("admin.users.view")
    .input(
      z.object({
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(1).max(100).default(25),
        search: z.string().optional(),
        sortBy: z.enum(sortKeys).optional(),
        sortDirection: z.enum(["asc", "desc"]).default("asc"),
      }),
    )
    .query(async ({ input }) => {
      const trimmedSearch = input.search?.trim();
      const condition = trimmedSearch
        ? or(ilike(users.name, `%${trimmedSearch}%`), ilike(users.email, `%${trimmedSearch}%`))
        : undefined;
      const sortColumn = SORTABLE_COLUMNS[input.sortBy ?? "createdAt"];
      const order = input.sortDirection === "desc" ? desc(sortColumn) : asc(sortColumn);

      const [rows, [totalRow]] = await Promise.all([
        db
          .select()
          .from(users)
          .where(condition)
          .orderBy(order)
          .limit(input.pageSize)
          .offset((input.page - 1) * input.pageSize),
        db.select({ total: count() }).from(users).where(condition),
      ]);

      // Second query, not a join against users -- a user can have more than
      // one linked account (better-auth's default account linking, e.g.
      // email+password now, Google later on the same email), and a join
      // would either duplicate the user row per account or need a messy
      // GROUP BY/array_agg on top of the pagination query above. Scoped to
      // just this page's rows, same shape as avatarUrl's per-row resolution
      // below.
      const rowIds = rows.map((user) => user.id);
      const accountRows = rowIds.length
        ? await db
            .select({ userId: accounts.userId, providerId: accounts.providerId })
            .from(accounts)
            .where(inArray(accounts.userId, rowIds))
        : [];
      const protocolsByUserId = new Map<string, AuthProtocolName[]>();
      for (const { userId, providerId } of accountRows) {
        const protocol = PROVIDER_TO_PROTOCOL[providerId] ?? (providerId as AuthProtocolName);
        const existing = protocolsByUserId.get(userId) ?? [];
        existing.push(protocol);
        protocolsByUserId.set(userId, existing);
      }

      return {
        users: await Promise.all(
          rows.map(async (user) => ({
            ...user,
            avatarUrl: await resolveAvatarUrl(user.avatarUrl),
            authProtocols: protocolsByUserId.get(user.id) ?? [],
          })),
        ),
        total: totalRow?.total ?? 0,
      };
    }),

  // Neither of these lets an admin target their own row -- an admin
  // demoting or deactivating themselves (the only owner in the system,
  // say) would be a self-inflicted lockout with no UI left to undo it
  // from. Role/profile changes to your own account already go through
  // ApplicationProfile.tsx instead.
  setUserRole: protectedProcedure
    .input(z.object({ userId: z.string(), role: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (input.userId === ctx.session.user.id) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "You can't change your own role here." });
      }

      const [target] = await db.select({ role: users.role }).from(users).where(eq(users.id, input.userId));
      if (!target) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found." });
      }

      // Granting or revoking "owner" specifically needs the more
      // sensitive of the two permissions -- moving someone into or out of
      // owner is a bigger deal than moving between every other role, the
      // same split the RBAC feature list makes explicit
      // (admin.users.update-owner vs. admin.users.update-role).
      const touchesOwner = target.role === "owner" || input.role === "owner";
      const required = touchesOwner ? "admin.users.update-owner" : "admin.users.update-role";
      if (!(await hasPermission(ctx.session.user.role, required))) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      // role is a plain string now, not a fixed z.enum -- roles are
      // admin-creatable/deletable at runtime (db/roles-schema.ts), so this
      // is the real existence check that USER_ROLES' static enum used to
      // give for free. users.role also has a real DB-level FK onto
      // roles.name (added by hand in that table's migration), so this
      // isn't the only thing standing between a bad value and the row --
      // it's just a clearer error than a raw constraint-violation would be.
      const [role] = await db.select({ name: roles.name }).from(roles).where(eq(roles.name, input.role));
      if (!role) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "That role doesn't exist." });
      }

      const [updated] = await db
        .update(users)
        .set({ role: input.role })
        .where(eq(users.id, input.userId))
        .returning({ id: users.id, role: users.role });

      if (!updated) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found." });
      }

      return updated;
    }),

  setUserActive: protectedProcedure
    .input(z.object({ userId: z.string(), active: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      if (input.userId === ctx.session.user.id) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "You can't change your own status here." });
      }
      if (!(await hasPermission(ctx.session.user.role, "admin.users.update-status"))) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      // Owner can't be deactivated by anyone, not even another owner -- same
      // "no code-level bypass for owner" precedent as roles.ts's delete
      // guard and feature-roles.ts's un-revokable owner grant, applied here
      // ad hoc rather than through a permission (this isn't gated behind
      // admin.users.update-status at all; it's a hard floor under it, same
      // category as the self-lockout check above). Only the deactivate
      // direction is blocked -- reactivating one (input.active: true) never
      // hits this branch at all. Change their role first.
      if (!input.active) {
        const [target] = await db.select({ role: users.role }).from(users).where(eq(users.id, input.userId));
        if (target?.role === "owner") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Owner accounts can't be deactivated -- change their role first.",
          });
        }
      }

      const [updated] = await db
        .update(users)
        .set({ active: input.active })
        .where(eq(users.id, input.userId))
        .returning({ id: users.id, active: users.active });

      if (!updated) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found." });
      }

      return updated;
    }),
});
