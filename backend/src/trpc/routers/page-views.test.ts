import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { db } from "../../db/index.js";
import { pageViews } from "../../db/schema.js";
import { contextFor, createTestUser } from "../../test/context.js";
import { resetDb } from "../../test/reset-db.js";
import { createCallerFactory, type Context } from "../trpc.js";
import { pageViewsRouter } from "./page-views.js";

const createCaller = createCallerFactory(pageViewsRouter);
const noSessionCtx: Context = { session: null };

beforeEach(async () => {
  await resetDb();
});

describe("pageViews.list", () => {
  it("rejects a caller without admin.features.view", async () => {
    const standardUser = await createTestUser({ role: "standard" });
    const caller = createCaller(contextFor(standardUser));
    await expect(caller.list()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("includes the real seeded admin tabs", async () => {
    const admin = await createTestUser({ role: "administrator" });
    const caller = createCaller(contextFor(admin));

    const result = await caller.list();

    expect(result.map((pageView) => pageView.key)).toEqual(
      expect.arrayContaining(["admin.users", "admin.roles"]),
    );
  });
});

describe("pageViews.setEnabled", () => {
  it("rejects an unauthenticated caller", async () => {
    const caller = createCaller(noSessionCtx);
    await expect(caller.setEnabled({ key: "admin.users", enabled: false })).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it("lets owner toggle a page view off and back on", async () => {
    const owner = await createTestUser({ role: "owner" });
    const caller = createCaller(contextFor(owner));

    const off = await caller.setEnabled({ key: "admin.users", enabled: false });
    expect(off?.enabled).toBe(false);
    const on = await caller.setEnabled({ key: "admin.users", enabled: true });
    expect(on?.enabled).toBe(true);

    await db.update(pageViews).set({ enabled: true }).where(eq(pageViews.key, "admin.users"));
  });
});
