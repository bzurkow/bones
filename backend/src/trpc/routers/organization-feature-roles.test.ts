import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { db } from "../../db/index.js";
import { organizationFeatureRoles, organizationFeatures } from "../../db/schema.js";
import { contextFor, createTestUser } from "../../test/context.js";
import { resetDb } from "../../test/reset-db.js";
import { createCallerFactory, type Context } from "../trpc.js";
import { organizationsRouter } from "./organizations.js";
import { organizationFeatureRolesRouter } from "./organization-feature-roles.js";

const createOrgCaller = createCallerFactory(organizationsRouter);
const createCaller = createCallerFactory(organizationFeatureRolesRouter);
const noSessionCtx: Context = { session: null };

async function createTestOrg() {
  const owner = await createTestUser({ role: "owner" });
  const caller = createOrgCaller(contextFor(owner));
  const org = await caller.create({ name: `test-org-${randomUUID()}`, blurb: "", initialAdminUserId: owner.id });
  return org!;
}

beforeEach(async () => {
  await resetDb();
});

describe("organizations.featureRoles.listAll", () => {
  it("rejects an unauthenticated caller", async () => {
    const caller = createCaller(noSessionCtx);
    await expect(caller.listAll({ organizationId: "irrelevant" })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("rejects a non-member without admin.organizations.update", async () => {
    const org = await createTestOrg();
    const outsider = await createTestUser({ role: "standard" });
    const caller = createCaller(contextFor(outsider));
    await expect(caller.listAll({ organizationId: org.id })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

describe("organizations.featureRoles.setGranted", () => {
  it("rejects a caller without admin.organizations.update", async () => {
    const org = await createTestOrg();
    const standardUser = await createTestUser({ role: "standard" });
    const caller = createCaller(contextFor(standardUser));
    await expect(
      caller.setGranted({ organizationId: org.id, featureKey: "irrelevant", role: "admin", granted: true }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("inserts a new grant row when none exists yet", async () => {
    const org = await createTestOrg();
    const owner = await createTestUser({ role: "owner" });
    const caller = createCaller(contextFor(owner));
    const key = `test.feature.${randomUUID()}`;
    await db.insert(organizationFeatures).values({ organizationId: org.id, key, label: "Test" });

    const result = await caller.setGranted({ organizationId: org.id, featureKey: key, role: "viewer", granted: true });

    expect(result).toMatchObject({ organizationId: org.id, featureKey: key, role: "viewer", granted: true });
  });

  it("updates an existing grant row instead of duplicating it", async () => {
    const org = await createTestOrg();
    const owner = await createTestUser({ role: "owner" });
    const caller = createCaller(contextFor(owner));
    const key = `test.feature.${randomUUID()}`;
    await db.insert(organizationFeatures).values({ organizationId: org.id, key, label: "Test" });
    await db
      .insert(organizationFeatureRoles)
      .values({ organizationId: org.id, featureKey: key, role: "viewer", granted: true });

    await caller.setGranted({ organizationId: org.id, featureKey: key, role: "viewer", granted: false });

    const rows = await db
      .select()
      .from(organizationFeatureRoles)
      .where(and(eq(organizationFeatureRoles.featureKey, key), eq(organizationFeatureRoles.role, "viewer")));
    expect(rows).toHaveLength(1);
    expect(rows[0]?.granted).toBe(false);
  });

  it('refuses to revoke admin\'s grant on any feature -- "org admin must have all update permissions"', async () => {
    const org = await createTestOrg();
    const owner = await createTestUser({ role: "owner" });
    const caller = createCaller(contextFor(owner));

    // One of the four seeded built-ins...
    await expect(
      caller.setGranted({ organizationId: org.id, featureKey: "profile.update", role: "admin", granted: false }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });

    // ...and a custom feature too -- the guard isn't scoped to just the
    // four built-ins, same blanket scope as the global router's own
    // owner-grant guard.
    const key = `test.feature.${randomUUID()}`;
    await db.insert(organizationFeatures).values({ organizationId: org.id, key, label: "Test" });
    await db
      .insert(organizationFeatureRoles)
      .values({ organizationId: org.id, featureKey: key, role: "admin", granted: true });
    await expect(
      caller.setGranted({ organizationId: org.id, featureKey: key, role: "admin", granted: false }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });

    const [row] = await db
      .select()
      .from(organizationFeatureRoles)
      .where(
        and(eq(organizationFeatureRoles.featureKey, "profile.update"), eq(organizationFeatureRoles.role, "admin")),
      );
    expect(row?.granted).toBe(true);
  });

  it("still allows granting admin true (only revoking is blocked)", async () => {
    const org = await createTestOrg();
    const owner = await createTestUser({ role: "owner" });
    const caller = createCaller(contextFor(owner));
    const key = `test.feature.${randomUUID()}`;
    await db.insert(organizationFeatures).values({ organizationId: org.id, key, label: "Test" });

    const result = await caller.setGranted({ organizationId: org.id, featureKey: key, role: "admin", granted: true });

    expect(result).toMatchObject({ featureKey: key, role: "admin", granted: true });
  });
});
