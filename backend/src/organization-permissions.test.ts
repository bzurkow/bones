import { randomUUID } from "node:crypto";
import { beforeEach, describe, expect, it } from "vitest";
import { db } from "./db/index.js";
import { organizationFeatureRoles, organizationFeatures } from "./db/schema.js";
import { ORGANIZATION_TAB_UPDATE_FEATURES, getEnabledOrganizationFeatures } from "./organization-permissions.js";
import { contextFor, createTestUser } from "./test/context.js";
import { resetDb } from "./test/reset-db.js";
import { createCallerFactory } from "./trpc/trpc.js";
import { organizationsRouter } from "./trpc/routers/organizations.js";

const createOrgCaller = createCallerFactory(organizationsRouter);

async function createTestOrg() {
  const owner = await createTestUser({ role: "owner" });
  const caller = createOrgCaller(contextFor(owner));
  const org = await caller.create({ name: `test-org-${randomUUID()}`, blurb: "", initialAdminUserId: owner.id });
  return org!;
}

beforeEach(async () => {
  await resetDb();
});

// No current call site (see this function's own comment) -- direct
// coverage instead of relying on a router to exercise it, same as
// permissions.test.ts's own getEnabledFeatures suite.
describe("getEnabledOrganizationFeatures", () => {
  it("a brand-new organization's admin role already has the four tab-update keys", async () => {
    const org = await createTestOrg();
    expect(await getEnabledOrganizationFeatures(org.id, "admin")).toEqual(
      expect.arrayContaining([...ORGANIZATION_TAB_UPDATE_FEATURES]),
    );
  });

  it("a brand-new organization's standard role has nothing", async () => {
    const org = await createTestOrg();
    expect(await getEnabledOrganizationFeatures(org.id, "standard")).toEqual([]);
  });

  it("returns only enabled + granted feature keys", async () => {
    const org = await createTestOrg();
    const grantedKey = `test.feature.${randomUUID()}`;
    const disabledKey = `test.feature.${randomUUID()}`;
    const ungrantedKey = `test.feature.${randomUUID()}`;
    await db.insert(organizationFeatures).values([
      { organizationId: org.id, key: grantedKey, label: "Granted", enabled: true },
      { organizationId: org.id, key: disabledKey, label: "Disabled", enabled: false },
      { organizationId: org.id, key: ungrantedKey, label: "Ungranted", enabled: true },
    ]);
    // "standard" -- no built-in tab-update grants to contaminate the
    // result, unlike "admin" (see this org's own seeded state above).
    await db.insert(organizationFeatureRoles).values([
      { organizationId: org.id, featureKey: grantedKey, role: "standard", granted: true },
      { organizationId: org.id, featureKey: disabledKey, role: "standard", granted: true },
    ]);

    const result = await getEnabledOrganizationFeatures(org.id, "standard");

    expect(result).toEqual([grantedKey]);
  });

  it("is scoped per role", async () => {
    const org = await createTestOrg();
    const key = `test.feature.${randomUUID()}`;
    await db.insert(organizationFeatures).values({ organizationId: org.id, key, label: "Test", enabled: true });
    await db
      .insert(organizationFeatureRoles)
      .values({ organizationId: org.id, featureKey: key, role: "viewer", granted: true });

    expect(await getEnabledOrganizationFeatures(org.id, "viewer")).toEqual([key]);
    expect(await getEnabledOrganizationFeatures(org.id, "standard")).toEqual([]);
  });
});
