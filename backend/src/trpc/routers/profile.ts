import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../../db/index.js";
import { users } from "../../db/schema.js";
import { AVATAR_BUCKET, getPresignedUploadUrl } from "../../storage/index.js";
import { ALLOWED_AVATAR_CONTENT_TYPES } from "../../user-fields.js";
import { protectedProcedure, router } from "../trpc.js";

const EXTENSION_FOR_CONTENT_TYPE: Record<(typeof ALLOWED_AVATAR_CONTENT_TYPES)[number], string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export const profileRouter = router({
  // Issues a presigned PUT the browser uploads the file to directly --
  // AWS credentials never reach the client, same pattern
  // terms-and-conditions would use for a real user-uploaded file (see its
  // own comment on why *its* update takes markdown directly instead: that
  // content is small trusted admin text, this is an arbitrary file from an
  // untrusted browser). Content-type is enforced here (and by S3 itself,
  // which checks the presigned request's Content-Type against what it was
  // signed for) -- file *size* is deliberately not enforced server-side;
  // see MAX_AVATAR_BYTES's comment in user-fields.ts for why (would need an
  // S3 POST policy, not a presigned PUT).
  //
  // Keyed by the caller's own user id (never client-supplied) so
  // confirmAvatarUpload below can cheaply verify ownership of the key
  // without a DB round-trip.
  requestAvatarUpload: protectedProcedure
    .input(z.object({ contentType: z.enum(ALLOWED_AVATAR_CONTENT_TYPES) }))
    .mutation(async ({ ctx, input }) => {
      const key = `${ctx.session.user.id}/${crypto.randomUUID()}.${EXTENSION_FOR_CONTENT_TYPE[input.contentType]}`;
      const uploadUrl = await getPresignedUploadUrl(AVATAR_BUCKET, key, input.contentType);
      return { uploadUrl, key };
    }),

  // Separate from requestAvatarUpload because the backend has no way to
  // know the browser's direct-to-S3 PUT actually succeeded (no event
  // notifications wired up for local RustFS) -- the client calls this only
  // after its own upload fetch() resolved. Requiring the key to be
  // prefixed with the caller's own id (set by requestAvatarUpload above,
  // never accepted from the client there either) stops a caller from
  // pointing their own avatarUrl at an object some other user uploaded.
  confirmAvatarUpload: protectedProcedure
    .input(z.object({ key: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      if (!input.key.startsWith(`${ctx.session.user.id}/`)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "That upload doesn't belong to you." });
      }

      const [updated] = await db
        .update(users)
        .set({ avatarUrl: input.key })
        .where(eq(users.id, ctx.session.user.id))
        .returning({ avatarUrl: users.avatarUrl });

      return updated;
    }),
});
