import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { AUTH_PROTOCOLS } from "../../auth-protocols.js";
import { db } from "../../db/index.js";
import { authProtocols } from "../../db/schema.js";
import { adminProcedure, publicProcedure, router } from "../trpc.js";

export const authProtocolsRouter = router({
  // Public/unauthenticated -- Login.tsx and SignUp.tsx need this before a
  // session exists at all, to know which auth methods to show.
  list: publicProcedure.query(() => db.select().from(authProtocols)),

  setEnabled: adminProcedure
    .input(z.object({ name: z.enum(AUTH_PROTOCOLS), enabled: z.boolean() }))
    .mutation(async ({ input }) => {
      if (!input.enabled) {
        // Same self-lockout precedent as admin.ts's
        // setUserRole/setUserActive: don't let the last enabled protocol
        // get turned off, or nobody -- not even an owner -- would have any
        // way left to sign in and turn it back on. See
        // bones-roadmap-notes.md item 3a: this is another ad hoc guard,
        // same as that one, pending the real permissions design.
        const enabled = await db.select({ name: authProtocols.name }).from(authProtocols).where(eq(authProtocols.enabled, true));
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
