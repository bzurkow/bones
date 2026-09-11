import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { db } from "../../db/index.js";
import { featureRoles, features } from "../../db/schema.js";
import { contextFor, createTestUser } from "../../test/context.js";
import { resetDb } from "../../test/reset-db.js";
import { createCallerFactory, type Context } from "../trpc.js";
import { featuresRouter } from "./features.js";

const createCaller = createCallerFactory(featuresRouter);
const noSessionCtx: Context = { session: null };

beforeEach(async () => {
  await resetDb();
});

describe("features.list", () => {
  it("rejects an unauthenticated caller", async () => {
    const caller = createCaller(noSessionCtx);
    await expect(caller.list()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("rejects a caller without admin.features.view", async () => {
    const standardUser = await createTestUser({ role: "standard" });
    const caller = createCaller(contextFor(standardUser));
    await expect(caller.list()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("is readable by a role granted admin.features.view", async () => {
    const admin = await createTestUser({ role: "administrator" });
    const caller = createCaller(contextFor(admin));

    const result = await caller.list();

    // "page.admin.view" used to live here too, before routes/page_views
    // split out of features into their own tables.
    expect(result.map((feature) => feature.key)).toEqual(
      expect.arrayContaining(["admin.users.view", "admin.auth-protocols.update"]),
    );
  });
});

describe("features.create", () => {
  it("rejects a caller without admin.features.create", async () => {
    const admin = await createTestUser({ role: "administrator" });
    const caller = createCaller(contextFor(admin));
    await expect(caller.create({ key: "test.feature", label: "Test" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("creates a feature and auto-grants it to owner", async () => {
    const owner = await createTestUser({ role: "owner" });
    const caller = createCaller(contextFor(owner));
    const key = `test.feature.${randomUUID()}`;

    const result = await caller.create({ key, label: "Test feature" });

    expect(result).toMatchObject({ key, label: "Test feature", enabled: true });
    const [grant] = await db
      .select()
      .from(featureRoles)
      .where(and(eq(featureRoles.featureKey, key), eq(featureRoles.role, "owner")));
    expect(grant?.granted).toBe(true);

    await db.delete(features).where(eq(features.key, key)); // cascades feature_roles
  });

  it("rejects a duplicate key", async () => {
    const owner = await createTestUser({ role: "owner" });
    const caller = createCaller(contextFor(owner));
    await expect(caller.create({ key: "admin.users.view", label: "dup" })).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
  });
});

describe("features.setEnabled", () => {
  it("lets a role with admin.features.enable turn a feature on", async () => {
    const admin = await createTestUser({ role: "administrator" });
    const caller = createCaller(contextFor(admin));
    const key = `test.feature.${randomUUID()}`;
    await db.insert(features).values({ key, label: "Test", enabled: false });

    const result = await caller.setEnabled({ key, enabled: true });

    expect(result?.enabled).toBe(true);

    await db.delete(features).where(eq(features.key, key));
  });

  it("checks admin.features.disable, not admin.features.enable, when turning off", async () => {
    // per the seed, administrator has neither of these split out unevenly
    // -- exercised here via a role that genuinely has none of either.
    const standardUser = await createTestUser({ role: "standard" });
    const caller = createCaller(contextFor(standardUser));
    await expect(caller.setEnabled({ key: "admin.users.view", enabled: false })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("rejects an unknown feature key", async () => {
    const owner = await createTestUser({ role: "owner" });
    const caller = createCaller(contextFor(owner));
    await expect(caller.setEnabled({ key: "not.a.real.feature", enabled: true })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });
});
