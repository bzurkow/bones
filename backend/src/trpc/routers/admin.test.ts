import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { db } from "../../db/index.js";
import { users } from "../../db/schema.js";
import { resetDb } from "../../test/reset-db.js";
import { contextFor, createTestUser } from "../../test/context.js";
import { AVATAR_BUCKET, getPresignedUploadUrl } from "../../storage/index.js";
import { createCallerFactory, type Context } from "../trpc.js";
import { adminRouter } from "./admin.js";

const createCaller = createCallerFactory(adminRouter);
const noSessionCtx: Context = { session: null };

beforeEach(async () => {
  await resetDb();
});

describe("admin.listUsers", () => {
  it("rejects an unauthenticated caller", async () => {
    const caller = createCaller(noSessionCtx);
    await expect(caller.listUsers({})).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("rejects a signed-in non-admin caller", async () => {
    const standardUser = await createTestUser({ role: "standard" });
    const caller = createCaller(contextFor(standardUser));
    await expect(caller.listUsers({})).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("paginates, sorted by name, with a correct total", async () => {
    const admin = await createTestUser({ role: "owner", name: "Admin" });
    for (const name of ["User 1", "User 2", "User 3", "User 4"]) {
      await createTestUser({ name });
    }
    const caller = createCaller(contextFor(admin));

    const page1 = await caller.listUsers({ page: 1, pageSize: 2, sortBy: "name", sortDirection: "asc" });
    expect(page1.total).toBe(5);
    expect(page1.users.map((u) => u.name)).toEqual(["Admin", "User 1"]);

    const page3 = await caller.listUsers({ page: 3, pageSize: 2, sortBy: "name", sortDirection: "asc" });
    expect(page3.users.map((u) => u.name)).toEqual(["User 4"]);
  });

  it("searches by name and by email independently", async () => {
    const admin = await createTestUser({ role: "owner" });
    await createTestUser({ name: "Distinctive Name", email: "other@example.test" });
    await createTestUser({ name: "Someone Else", email: "distinctive-email@example.test" });
    const caller = createCaller(contextFor(admin));

    const byName = await caller.listUsers({ search: "distinctive name" });
    expect(byName.users.map((u) => u.name)).toEqual(["Distinctive Name"]);

    const byEmail = await caller.listUsers({ search: "distinctive-email" });
    expect(byEmail.users.map((u) => u.name)).toEqual(["Someone Else"]);
  });

  it("reorders results when sortDirection is desc", async () => {
    const admin = await createTestUser({ role: "owner", name: "A" });
    await createTestUser({ name: "B" });
    await createTestUser({ name: "C" });
    const caller = createCaller(contextFor(admin));

    const result = await caller.listUsers({ sortBy: "name", sortDirection: "desc" });
    expect(result.users.map((u) => u.name)).toEqual(["C", "B", "A"]);
  });

  it("resolves a real, working presigned URL for a user with an avatar", async () => {
    const admin = await createTestUser({ role: "owner" });
    const withAvatar = await createTestUser({ name: "Has Avatar" });

    const key = `${withAvatar.id}/photo.jpg`;
    const bytes = new Uint8Array([1, 2, 3, 4]);
    const uploadUrl = await getPresignedUploadUrl(AVATAR_BUCKET, key, "image/jpeg");
    const put = await fetch(uploadUrl, { method: "PUT", headers: { "Content-Type": "image/jpeg" }, body: bytes });
    expect(put.status).toBe(200);

    // createTestUser (test/context.ts) always inserts a fresh row with no
    // avatarUrl override plumbed through -- update the row directly instead,
    // same as trpc/routers/profile.ts's own confirmAvatarUpload does.
    await db.update(users).set({ avatarUrl: key }).where(eq(users.id, withAvatar.id));

    const caller = createCaller(contextFor(admin));
    const result = await caller.listUsers({ search: "Has Avatar" });
    const row = result.users[0];
    expect(row?.avatarUrl).toBeTruthy();

    const res = await fetch(row!.avatarUrl!);
    expect(res.status).toBe(200);
    expect(new Uint8Array(await res.arrayBuffer())).toEqual(bytes);
  });
});
