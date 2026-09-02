import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../../db/index.js";
import { USER_VIEW_MODES, users } from "../../db/schema.js";
import { protectedProcedure, router } from "../trpc.js";

// No getter here -- inheritViewModeFromBrowser/viewMode are
// user.additionalFields (see auth.ts), so they're already on
// session.user for every signed-in request; a dedicated get would just be
// a slower way to read what the client already has.
export const userSettingsRouter = router({
  updateUserSettings: protectedProcedure
    .input(
      z
        .object({
          inheritViewModeFromBrowser: z.boolean().optional(),
          viewMode: z.enum(USER_VIEW_MODES).optional(),
        })
        .refine((input) => Object.keys(input).length > 0, "Provide at least one field to update."),
    )
    .mutation(async ({ ctx, input }) => {
      // Written directly against `users`, not through better-auth's own
      // updateUser -- these two fields are input: false specifically so
      // this is the only path that can change them (see auth.ts), and
      // `where` is always the caller's own id, never a client-supplied one.
      const [updated] = await db
        .update(users)
        .set(input)
        .where(eq(users.id, ctx.session.user.id))
        .returning({
          inheritViewModeFromBrowser: users.inheritViewModeFromBrowser,
          viewMode: users.viewMode,
        });

      return updated;
    }),
});
