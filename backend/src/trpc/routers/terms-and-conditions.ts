import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../../db/index.js";
import { termsAndConditions, userTermsAndConditions } from "../../db/schema.js";
import { getObjectText, getPresignedDownloadUrl, uploadObject } from "../../storage/index.js";
import { adminProcedure, protectedProcedure, publicProcedure, router } from "../trpc.js";

export const termsAndConditionsRouter = router({
  // Public: whoever needs to show/link the current terms doesn't
  // necessarily have a session yet (e.g. a signup page). Acceptance status
  // for the signed-in user specifically lives on the session itself (see
  // auth.ts's customSession plugin / hasAcceptedTermsAndConditions), not
  // here -- this is just "what is the current version." Returns both
  // assetUrl (a presigned URL, for direct linking/download) and the raw
  // markdown content itself (fetched server-side -- see
  // storage/index.ts's getObjectText -- so a consumer like the admin edit
  // form doesn't need its own browser-side fetch against a bucket with no
  // CORS policy configured).
  get: publicProcedure.query(async () => {
    const [active] = await db.select().from(termsAndConditions).where(eq(termsAndConditions.active, true)).limit(1);

    if (!active) return null;

    const [assetUrl, content] = await Promise.all([
      getPresignedDownloadUrl(active.assetUrl),
      getObjectText(active.assetUrl),
    ]);

    return { ...active, assetUrl, content };
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
      // Date-stamped (not just the id) so the bucket itself stays readable
      // and sortable by when each version was posted, not just a list of
      // opaque UUIDs -- the id alone already guarantees no overwrite, this
      // is about the object listing being legible at a glance.
      const dateStamp = new Date().toISOString().replace(/[:.]/g, "-");
      const key = `terms-and-conditions/${dateStamp}-${id}.md`;

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

  // userId always comes from ctx.session.user.id, never the input -- taking
  // it from the caller's own session (not a client-supplied field) is
  // deliberate, same reasoning as userSettings.updateUserSettings: a user
  // can only ever accept on their own behalf, never forge another user's
  // acceptance record. termsAndConditionsId is still an explicit input
  // (not "whichever version is currently active") so acceptance is tied to
  // the exact version the caller actually saw via `get`, even if a newer
  // one goes active in between -- not the currently-active one necessarily.
  // Upserts: a caller re-accepting (or accepting a version they'd
  // previously been given a not-yet-accepted row for) just refreshes
  // accepted/acceptedDate rather than erroring on the composite PK.
  accept: protectedProcedure
    .input(z.object({ termsAndConditionsId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const [terms] = await db
        .select({ id: termsAndConditions.id })
        .from(termsAndConditions)
        .where(eq(termsAndConditions.id, input.termsAndConditionsId))
        .limit(1);

      if (!terms) {
        throw new TRPCError({ code: "NOT_FOUND", message: "No terms and conditions version with that id." });
      }

      const [accepted] = await db
        .insert(userTermsAndConditions)
        .values({
          termsAndConditionsId: input.termsAndConditionsId,
          userId: ctx.session.user.id,
          accepted: true,
          acceptedDate: new Date(),
        })
        .onConflictDoUpdate({
          target: [userTermsAndConditions.termsAndConditionsId, userTermsAndConditions.userId],
          set: { accepted: true, acceptedDate: new Date() },
        })
        .returning();

      return accepted;
    }),
});
