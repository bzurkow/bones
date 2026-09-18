import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { db } from "../../db/index.js";
import { organizationFeatures } from "../../db/schema.js";
import { CHATBOT_FEATURE_KEY, ORGANIZATION_TAB_UPDATE_FEATURES } from "../../organization-permissions.js";
import { contextFor, createTestUser } from "../../test/context.js";
import { resetDb } from "../../test/reset-db.js";
import { createCallerFactory, type Context } from "../trpc.js";
import { organizationsRouter } from "./organizations.js";
import { organizationFeaturesRouter } from "./organization-features.js";

const createOrgCaller = createCallerFactory(organizationsRouter);
const createCaller = createCallerFactory(organizationFeaturesRouter);
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

describe("organizations.features.list", () => {
  it("rejects an unauthenticated caller", async () => {
    const caller = createCaller(noSessionCtx);
    await expect(caller.list({ organizationId: "irrelevant" })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("rejects a non-member without admin.organizations.update", async () => {
    const org = await createTestOrg();
    const outsider = await createTestUser({ role: "standard" });
    const caller = createCaller(contextFor(outsider));
    await expect(caller.list({ organizationId: org.id })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("a brand-new organization already has the four seeded tab-update features plus chatbot", async () => {
    const org = await createTestOrg();
    const owner = await createTestUser({ role: "owner" });
    const caller = createCaller(contextFor(owner));

    const result = await caller.list({ organizationId: org.id });

    expect(result.map((feature) => feature.key).sort()).toEqual(
      [...ORGANIZATION_TAB_UPDATE_FEATURES, CHATBOT_FEATURE_KEY].sort(),
    );
  });

  it("seeds chatbot enabled but granted to no role", async () => {
    const org = await createTestOrg();
    const owner = await createTestUser({ role: "owner" });
    const caller = createCaller(contextFor(owner));

    const result = await caller.list({ organizationId: org.id });

    const chatbot = result.find((feature) => feature.key === CHATBOT_FEATURE_KEY);
    expect(chatbot?.enabled).toBe(true);
  });
});

describe("organizations.features.setEnabled", () => {
  it("rejects a caller without admin.organizations.update", async () => {
    const org = await createTestOrg();
    const standardUser = await createTestUser({ role: "standard" });
    const caller = createCaller(contextFor(standardUser));
    await expect(caller.setEnabled({ organizationId: org.id, key: "irrelevant", enabled: true })).rejects.toMatchObject(
      {
        code: "FORBIDDEN",
      },
    );
  });

  it("404s on an unknown feature", async () => {
    const org = await createTestOrg();
    const owner = await createTestUser({ role: "owner" });
    const caller = createCaller(contextFor(owner));
    await expect(
      caller.setEnabled({ organizationId: org.id, key: `unknown-${randomUUID()}`, enabled: true }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("toggles an existing feature", async () => {
    const org = await createTestOrg();
    const owner = await createTestUser({ role: "owner" });
    const caller = createCaller(contextFor(owner));
    const key = `test.feature.${randomUUID()}`;
    await db.insert(organizationFeatures).values({ organizationId: org.id, key, label: "Test", enabled: true });

    const result = await caller.setEnabled({ organizationId: org.id, key, enabled: false });

    expect(result?.enabled).toBe(false);
    const [row] = await db.select().from(organizationFeatures).where(eq(organizationFeatures.key, key));
    expect(row?.enabled).toBe(false);
  });
});
