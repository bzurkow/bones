import { beforeEach, describe, expect, it } from "vitest";
import { resetDb } from "../../test/reset-db.js";
import { contextFor, createTestUser } from "../../test/context.js";
import { createCallerFactory, type Context } from "../trpc.js";
import { profileRouter } from "./profile.js";

const createCaller = createCallerFactory(profileRouter);
const noSessionCtx: Context = { session: null };

beforeEach(async () => {
  await resetDb();
});

describe("profile.requestAvatarUpload", () => {
  it("rejects an unauthenticated caller", async () => {
    const caller = createCaller(noSessionCtx);
    await expect(caller.requestAvatarUpload({ contentType: "image/jpeg" })).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it("rejects a content type outside the allowlist", async () => {
    const user = await createTestUser();
    const caller = createCaller(contextFor(user));
    // @ts-expect-error -- deliberately invalid input, exercising the zod enum
    await expect(caller.requestAvatarUpload({ contentType: "image/gif" })).rejects.toThrow();
  });

  it("returns a real, working presigned PUT under the caller's own id, and it round-trips", async () => {
    const user = await createTestUser();
    const caller = createCaller(contextFor(user));

    const { uploadUrl, key } = await caller.requestAvatarUpload({ contentType: "image/jpeg" });
    expect(key.startsWith(`${user.id}/`)).toBe(true);
    expect(key.endsWith(".jpg")).toBe(true);

    // Not just "a URL was returned" -- confirms it's actually usable
    // against the real RustFS instance, same bar terms-and-conditions.test.ts
    // holds its own presigned URLs to.
    const put = await fetch(uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": "image/jpeg" },
      body: new Uint8Array([1, 2, 3]),
    });
    expect(put.status).toBe(200);
  });
});

describe("profile.confirmAvatarUpload", () => {
  it("rejects an unauthenticated caller", async () => {
    const caller = createCaller(noSessionCtx);
    await expect(caller.confirmAvatarUpload({ key: "some-user/photo.jpg" })).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it("rejects a key that doesn't belong to the caller", async () => {
    const user = await createTestUser();
    const caller = createCaller(contextFor(user));
    await expect(caller.confirmAvatarUpload({ key: "someone-else/photo.jpg" })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("saves the key as the caller's own avatarUrl", async () => {
    const user = await createTestUser();
    const caller = createCaller(contextFor(user));

    const result = await caller.confirmAvatarUpload({ key: `${user.id}/photo.jpg` });
    expect(result?.avatarUrl).toBe(`${user.id}/photo.jpg`);
  });
});
