import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { AUTH_PROTOCOLS } from "../../auth-protocols.js";
import { db } from "../../db/index.js";
import { authProtocols } from "../../db/schema.js";
import { publicProcedure, requirePermission, router } from "../trpc.js";

export const authProtocolsRouter = router({
  // Public/unauthenticated -- Login.tsx and SignUp.tsx need this before a
  // session exists at all, to know which auth methods to show. The admin
  // site-settings page's own view of this list is separately gated
  // client-side (admin.auth-protocols.view, AdminSiteSettings.tsx) -- that's
  // about whether the section renders on the page, not this query itself,
  // which every unauthenticated visitor already needs.
  list: publicProcedure.query(() => db.select().from(authProtocols)),

  // admin.auth-protocols.update, not the umbrella adminProcedure -- see the
  // RBAC migration's comment (0014_admin-auth-protocols-rbac.sql): only
  // owner/administrator get this, same granularity as admin.terms.update.
  setEnabled: requirePermission("admin.auth-protocols.update")
    .input(z.object({ name: z.enum(AUTH_PROTOCOLS), enabled: z.boolean() }))
    .mutation(async ({ input }) => {
      if (!input.enabled) {
        // Same self-lockout precedent as admin.ts's
        // setUserRole/setUserActive: don't let the last enabled protocol
        // get turned off, or nobody -- not even an owner -- would have any
        // way left to sign in and turn it back on. See
        // bones-roadmap-notes.md item 3a: this is another ad hoc guard,
        // same as that one, pending the real permissions design.
        const enabled = await db
          .select({ name: authProtocols.name })
          .from(authProtocols)
          .where(eq(authProtocols.enabled, true));
        if (enabled.length === 1 && enabled[0]?.name === input.name) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "At least one sign-in method must stay enabled." });
        }
      }

      const [updated] = await db
        .update(authProtocols)
        .set({ enabled: input.enabled })
        .where(eq(authProtocols.name, input.name))
        .returning();

      if (!updated) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Unknown auth protocol." });
      }

      return updated;
    }),
});
