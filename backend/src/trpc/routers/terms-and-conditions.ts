import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../../db/index.js";
import { termsAndConditions } from "../../db/schema.js";
import { getPresignedDownloadUrl, uploadObject } from "../../storage/index.js";
import { adminProcedure, publicProcedure, router } from "../trpc.js";

// No "accept" mutation yet -- the join table (user-terms-and-conditions-
// schema.ts) exists and auth.ts's customSession already reads from it via
// getHasAcceptedTermsAndConditions, but nothing writes to it yet. Add one
// here when a real "accept" flow is needed.

export const termsAndConditionsRouter = router({
  // Public: whoever needs to show/link the current terms doesn't
  // necessarily have a session yet (e.g. a signup page). Acceptance status
  // for the signed-in user specifically lives on the session itself (see
  // auth.ts's customSession plugin / hasAcceptedTermsAndConditions), not
  // here -- this is just "what is the current version."
  get: publicProcedure.query(async () => {
    const [active] = await db.select().from(termsAndConditions).where(eq(termsAndConditions.active, true)).limit(1);

    if (!active) return null;

    return { ...active, assetUrl: await getPresignedDownloadUrl(active.assetUrl) };
  }),

  // Admin-only. Takes the new version's raw markdown directly in the input
  // (not a presigned client upload -- this is small trusted text from an
  // already-authenticated admin, not a user uploading a file of their
  // own) -- see NOTES.md for why presigned URLs are still the pattern for
  // that other case. Inserts a new row rather than editing the current one
  // in place, so there's a real version history (see
  // db/terms-and-conditions-schema.ts's comment); the previous active row
  // (if any) is flipped off in the same transaction.
  update: adminProcedure
    .input(
      z.object({
        content: z.string().min(1),
        attribution: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const id = crypto.randomUUID();
      const key = `terms-and-conditions/${id}.md`;

      await uploadObject(key, input.content, "text/markdown");

      return db.transaction(async (tx) => {
        await tx.update(termsAndConditions).set({ active: false }).where(eq(termsAndConditions.active, true));

        const [created] = await tx
          .insert(termsAndConditions)
          .values({
            id,
            assetUrl: key,
            active: true,
            addedBy: ctx.session.user.id,
            termsAndConditionsAttribution: input.attribution,
          })
          .returning();

        return created;
      });
    }),
});
