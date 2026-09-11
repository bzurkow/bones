import { asc, count, desc, eq, ilike, or } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { db } from "../../db/index.js";
import { users } from "../../db/schema.js";
import { resolveAvatarUrl } from "../../storage/index.js";
import { USER_ROLES } from "../../user-fields.js";
import { adminProcedure, router } from "../trpc.js";

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
  listUsers: adminProcedure
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
        db
          .select({ total: count() })
          .from(users)
          .where(condition),
      ]);

      return {
        users: await Promise.all(
          rows.map(async (user) => ({ ...user, avatarUrl: await resolveAvatarUrl(user.avatarUrl) })),
        ),
        total: totalRow?.total ?? 0,
      };
    }),

  // Neither of these lets an admin target their own row -- an admin
  // demoting or deactivating themselves (the only owner in the system,
  // say) would be a self-inflicted lockout with no UI left to undo it
  // from. Role/profile changes to your own account already go through
  // ApplicationProfile.tsx instead.
  setUserRole: adminProcedure
    .input(z.object({ userId: z.string(), role: z.enum(USER_ROLES) }))
    .mutation(async ({ ctx, input }) => {
      if (input.userId === ctx.session.user.id) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "You can't change your own role here." });
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

  setUserActive: adminProcedure
    .input(z.object({ userId: z.string(), active: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      if (input.userId === ctx.session.user.id) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "You can't change your own status here." });
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
