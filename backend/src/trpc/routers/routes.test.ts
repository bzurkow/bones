import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { db } from "../../db/index.js";
import { routes } from "../../db/schema.js";
import { contextFor, createTestUser } from "../../test/context.js";
import { resetDb } from "../../test/reset-db.js";
import { createCallerFactory, type Context } from "../trpc.js";
import { routesRouter } from "./routes.js";

const createCaller = createCallerFactory(routesRouter);
const noSessionCtx: Context = { session: null };

beforeEach(async () => {
  await resetDb();
});

describe("routes.list", () => {
  it("rejects a caller without admin.features.view", async () => {
    const standardUser = await createTestUser({ role: "standard" });
    const caller = createCaller(contextFor(standardUser));
    await expect(caller.list()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("includes the real seeded 'admin' route", async () => {
    const admin = await createTestUser({ role: "administrator" });
    const caller = createCaller(contextFor(admin));

    const result = await caller.list();

    expect(result.map((route) => route.key)).toEqual(expect.arrayContaining(["admin"]));
  });
});

describe("routes.setEnabled", () => {
  it("rejects an unauthenticated caller", async () => {
    const caller = createCaller(noSessionCtx);
    await expect(caller.setEnabled({ key: "admin", enabled: false })).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it("checks admin.features.disable, not admin.features.enable, when turning off", async () => {
    const standardUser = await createTestUser({ role: "standard" });
    const caller = createCaller(contextFor(standardUser));
    await expect(caller.setEnabled({ key: "admin", enabled: false })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("lets owner toggle a route off and back on", async () => {
    const owner = await createTestUser({ role: "owner" });
    const caller = createCaller(contextFor(owner));

    const off = await caller.setEnabled({ key: "admin", enabled: false });
    expect(off?.enabled).toBe(false);
    const on = await caller.setEnabled({ key: "admin", enabled: true });
    expect(on?.enabled).toBe(true);

    // Restore -- routes isn't truncated between tests (same as roles/
    // features/auth_protocols), so leaving this off would leak.
    await db.update(routes).set({ enabled: true }).where(eq(routes.key, "admin"));
  });
});
