import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { db } from "../../db/index.js";
import { featureRoles, features } from "../../db/schema.js";
import { contextFor, createTestUser } from "../../test/context.js";
import { resetDb } from "../../test/reset-db.js";
import { createCallerFactory, type Context } from "../trpc.js";
import { featureRolesRouter } from "./feature-roles.js";

const createCaller = createCallerFactory(featureRolesRouter);
const noSessionCtx: Context = { session: null };

beforeEach(async () => {
  await resetDb();
});

describe("featureRoles.listAll", () => {
  it("rejects an unauthenticated caller", async () => {
    const caller = createCaller(noSessionCtx);
    await expect(caller.listAll()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("rejects a caller without admin.role-permissions.view", async () => {
    const standardUser = await createTestUser({ role: "standard" });
    const caller = createCaller(contextFor(standardUser));
    await expect(caller.listAll()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("returns the full grant matrix for a role that can view it", async () => {
    const owner = await createTestUser({ role: "owner" });
    const caller = createCaller(contextFor(owner));

    const result = await caller.listAll();

    expect(result).toEqual(expect.arrayContaining([{ featureKey: "admin.users.view", role: "owner", granted: true }]));
  });
});

describe("featureRoles.setGranted", () => {
  it("rejects a caller without admin.role-permissions.update", async () => {
    // administrator has view but not update per the seed -- a real
    // granularity case, not just "has nothing at all."
    const admin = await createTestUser({ role: "administrator" });
    const caller = createCaller(contextFor(admin));
    await expect(
      caller.setGranted({ featureKey: "admin.users.view", role: "demo", granted: true }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("inserts a new grant row when none exists yet", async () => {
    const owner = await createTestUser({ role: "owner" });
    const caller = createCaller(contextFor(owner));
    const key = `test.feature.${randomUUID()}`;
    await db.insert(features).values({ key, label: "Test" });

    const result = await caller.setGranted({ featureKey: key, role: "demo", granted: true });

    expect(result).toMatchObject({ featureKey: key, role: "demo", granted: true });

    await db.delete(features).where(eq(features.key, key)); // cascades feature_roles
  });

  it("updates an existing grant row instead of duplicating it", async () => {
    const owner = await createTestUser({ role: "owner" });
    const caller = createCaller(contextFor(owner));
    const key = `test.feature.${randomUUID()}`;
    await db.insert(features).values({ key, label: "Test" });
    await db.insert(featureRoles).values({ featureKey: key, role: "demo", granted: true });

    await caller.setGranted({ featureKey: key, role: "demo", granted: false });

    const rows = await db
      .select()
      .from(featureRoles)
      .where(and(eq(featureRoles.featureKey, key), eq(featureRoles.role, "demo")));
    expect(rows).toHaveLength(1);
    expect(rows[0]?.granted).toBe(false);

    await db.delete(features).where(eq(features.key, key));
  });

  it("refuses to revoke owner's grant on a feature", async () => {
    const owner = await createTestUser({ role: "owner" });
    const caller = createCaller(contextFor(owner));
    const key = `test.feature.${randomUUID()}`;
    // Real features are always seeded owner:true (features.ts's create
    // auto-grants it too) -- inserted explicitly here to exercise the
    // guard without depending on that seeding behavior.
    await db.insert(features).values({ key, label: "Test" });
    await db.insert(featureRoles).values({ featureKey: key, role: "owner", granted: true });

    await expect(caller.setGranted({ featureKey: key, role: "owner", granted: false })).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
    const [row] = await db
      .select()
      .from(featureRoles)
      .where(and(eq(featureRoles.featureKey, key), eq(featureRoles.role, "owner")));
    expect(row?.granted).toBe(true);

    await db.delete(features).where(eq(features.key, key));
  });

  it("still allows granting owner true (only revoking is blocked)", async () => {
    const owner = await createTestUser({ role: "owner" });
    const caller = createCaller(contextFor(owner));
    const key = `test.feature.${randomUUID()}`;
    await db.insert(features).values({ key, label: "Test" });

    const result = await caller.setGranted({ featureKey: key, role: "owner", granted: true });
    expect(result).toMatchObject({ featureKey: key, role: "owner", granted: true });

    await db.delete(features).where(eq(features.key, key));
  });
});
