import { and, eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { db } from "../../db/index.js";
import { routeRoles } from "../../db/schema.js";
import { contextFor, createTestUser } from "../../test/context.js";
import { resetDb } from "../../test/reset-db.js";
import { createCallerFactory, type Context } from "../trpc.js";
import { routeRolesRouter } from "./route-roles.js";

const createCaller = createCallerFactory(routeRolesRouter);
const noSessionCtx: Context = { session: null };

beforeEach(async () => {
  await resetDb();
});

describe("routeRoles.listAll", () => {
  it("rejects an unauthenticated caller", async () => {
    const caller = createCaller(noSessionCtx);
    await expect(caller.listAll()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("returns the real seeded owner grant on the admin route", async () => {
    const owner = await createTestUser({ role: "owner" });
    const caller = createCaller(contextFor(owner));

    const result = await caller.listAll();

    expect(result).toEqual(expect.arrayContaining([{ routeKey: "admin", role: "owner", granted: true }]));
  });
});

describe("routeRoles.setGranted", () => {
  it("rejects a caller without admin.role-permissions.update", async () => {
    const standardUser = await createTestUser({ role: "standard" });
    const caller = createCaller(contextFor(standardUser));
    await expect(
      caller.setGranted({ routeKey: "admin", role: "standard", granted: true }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("refuses to revoke owner's access to a route", async () => {
    const owner = await createTestUser({ role: "owner" });
    const caller = createCaller(contextFor(owner));

    await expect(caller.setGranted({ routeKey: "admin", role: "owner", granted: false })).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
    const [row] = await db
      .select()
      .from(routeRoles)
      .where(and(eq(routeRoles.routeKey, "admin"), eq(routeRoles.role, "owner")));
    expect(row?.granted).toBe(true);
  });

  it("still lets administrator's own access be granted and revoked (only owner is protected here)", async () => {
    const owner = await createTestUser({ role: "owner" });
    const caller = createCaller(contextFor(owner));

    await caller.setGranted({ routeKey: "admin", role: "administrator", granted: false });
    const [off] = await db
      .select()
      .from(routeRoles)
      .where(and(eq(routeRoles.routeKey, "admin"), eq(routeRoles.role, "administrator")));
    expect(off?.granted).toBe(false);

    // Restore -- route_roles isn't truncated between tests.
    await caller.setGranted({ routeKey: "admin", role: "administrator", granted: true });
  });
});
