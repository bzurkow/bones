import { and, eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { db } from "../../db/index.js";
import { pageViewRoles } from "../../db/schema.js";
import { contextFor, createTestUser } from "../../test/context.js";
import { resetDb } from "../../test/reset-db.js";
import { createCallerFactory, type Context } from "../trpc.js";
import { pageViewRolesRouter } from "./page-view-roles.js";

const createCaller = createCallerFactory(pageViewRolesRouter);
const noSessionCtx: Context = { session: null };

beforeEach(async () => {
  await resetDb();
});

describe("pageViewRoles.listAll", () => {
  it("rejects an unauthenticated caller", async () => {
    const caller = createCaller(noSessionCtx);
    await expect(caller.listAll()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("returns the real seeded owner grant on admin.users", async () => {
    const owner = await createTestUser({ role: "owner" });
    const caller = createCaller(contextFor(owner));

    const result = await caller.listAll();

    expect(result).toEqual(expect.arrayContaining([{ pageViewKey: "admin.users", role: "owner", granted: true }]));
  });
});

describe("pageViewRoles.setGranted", () => {
  it("rejects a caller without admin.role-permissions.update", async () => {
    const standardUser = await createTestUser({ role: "standard" });
    const caller = createCaller(contextFor(standardUser));
    await expect(
      caller.setGranted({ pageViewKey: "admin.users", role: "standard", granted: true }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("refuses to revoke owner's access to a page view", async () => {
    const owner = await createTestUser({ role: "owner" });
    const caller = createCaller(contextFor(owner));

    await expect(
      caller.setGranted({ pageViewKey: "admin.users", role: "owner", granted: false }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("refuses to revoke administrator's access too -- the extra rule specific to page views", async () => {
    const owner = await createTestUser({ role: "owner" });
    const caller = createCaller(contextFor(owner));

    await expect(
      caller.setGranted({ pageViewKey: "admin.users", role: "administrator", granted: false }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    const [row] = await db
      .select()
      .from(pageViewRoles)
      .where(and(eq(pageViewRoles.pageViewKey, "admin.users"), eq(pageViewRoles.role, "administrator")));
    expect(row?.granted).toBe(true);
  });

  it("still lets a non-owner/administrator role's grant be revoked", async () => {
    const owner = await createTestUser({ role: "owner" });
    const caller = createCaller(contextFor(owner));

    await caller.setGranted({ pageViewKey: "admin.users", role: "demo", granted: false });
    const [row] = await db
      .select()
      .from(pageViewRoles)
      .where(and(eq(pageViewRoles.pageViewKey, "admin.users"), eq(pageViewRoles.role, "demo")));
    expect(row?.granted).toBe(false);

    // Restore -- page_view_roles isn't truncated between tests.
    await caller.setGranted({ pageViewKey: "admin.users", role: "demo", granted: true });
  });
});
