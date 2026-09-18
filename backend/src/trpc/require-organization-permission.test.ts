import { randomUUID } from "node:crypto";
import { beforeEach, describe, expect, it } from "vitest";
import { z } from "zod";
import { db } from "../db/index.js";
import { organizationFeatureRoles, organizationFeatures } from "../db/schema.js";
import { contextFor, createTestUser } from "../test/context.js";
import { resetDb } from "../test/reset-db.js";
import { organizationsRouter } from "./routers/organizations.js";
import { createCallerFactory, requireOrganizationPermission, router } from "./trpc.js";

// A throwaway procedure/router purely to exercise requireOrganizationPermission
// directly with a feature key ("test.feature") that isn't one of the real
// org-scoped routers' own keys -- organizations.ts and organization-
// roles.ts/organization-features.ts/organization-feature-roles.ts all
// build real procedures on this primitive now, but testing it in
// isolation, with a key under this suite's own control, is still clearer
// than only ever exercising it indirectly through those.
const testRouter = router({
  check: requireOrganizationPermission("test.feature")
    .input(z.object({ organizationId: z.string() }))
    .query(() => "ok"),
});
const createCaller = createCallerFactory(testRouter);
const createOrgCaller = createCallerFactory(organizationsRouter);

async function createTestOrg() {
  const owner = await createTestUser({ role: "owner" });
  const caller = createOrgCaller(contextFor(owner));
  const org = await caller.create({ name: `test-org-${randomUUID()}`, blurb: "", initialAdminUserId: owner.id });
  return { owner, org: org! };
}

// A plain member with no global override -- "owner" (the test org's own
// initial admin fixture) always passes canUpdateOrg's global-override
// check regardless of any org-scoped grant, so the "should fail" cases
// below need a caller that isn't also a global owner/administrator.
async function addPlainMember(orgId: string, ownerContext: ReturnType<typeof contextFor>) {
  const ownerCaller = createOrgCaller(ownerContext);
  const member = await createTestUser({ role: "standard" });
  await ownerCaller.addMember({ organizationId: orgId, userId: member.id });
  return member;
}

beforeEach(async () => {
  await resetDb();
});

describe("requireOrganizationPermission", () => {
  it("rejects an unauthenticated caller", async () => {
    const caller = createCaller({ session: null });
    await expect(caller.check({ organizationId: "irrelevant" })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("throws BAD_REQUEST when the input has no organizationId", async () => {
    const owner = await createTestUser({ role: "owner" });
    const caller = createCaller(contextFor(owner));
    // @ts-expect-error -- exercising the runtime getRawInput guard directly
    await expect(caller.check({})).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("throws FORBIDDEN for someone who isn't a member of the org at all", async () => {
    const { org } = await createTestOrg();
    const outsider = await createTestUser({ role: "standard" });
    const caller = createCaller(contextFor(outsider));

    await expect(caller.check({ organizationId: org.id })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("throws FORBIDDEN for a plain member with no grant on that feature", async () => {
    const { org, owner } = await createTestOrg();
    const member = await addPlainMember(org.id, contextFor(owner));
    const caller = createCaller(contextFor(member));

    await expect(caller.check({ organizationId: org.id })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("succeeds for a member whose role has an enabled, granted feature", async () => {
    const { org, owner } = await createTestOrg();
    const member = await addPlainMember(org.id, contextFor(owner));
    await db
      .insert(organizationFeatures)
      .values({ organizationId: org.id, key: "test.feature", label: "Test", enabled: true });
    await db
      .insert(organizationFeatureRoles)
      .values({ organizationId: org.id, featureKey: "test.feature", role: "standard", granted: true });
    const caller = createCaller(contextFor(member));

    await expect(caller.check({ organizationId: org.id })).resolves.toBe("ok");
  });

  it("fails closed when the feature is globally disabled for the org", async () => {
    const { org, owner } = await createTestOrg();
    const member = await addPlainMember(org.id, contextFor(owner));
    await db
      .insert(organizationFeatures)
      .values({ organizationId: org.id, key: "test.feature", label: "Test", enabled: false });
    await db
      .insert(organizationFeatureRoles)
      .values({ organizationId: org.id, featureKey: "test.feature", role: "standard", granted: true });
    const caller = createCaller(contextFor(member));

    await expect(caller.check({ organizationId: org.id })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("succeeds via the global admin.organizations.update override alone, with no org-scoped grant at all", async () => {
    const { org } = await createTestOrg();
    // A different global owner, not even a member of this org.
    const otherOwner = await createTestUser({ role: "owner" });
    const caller = createCaller(contextFor(otherOwner));

    await expect(caller.check({ organizationId: org.id })).resolves.toBe("ok");
  });
});
