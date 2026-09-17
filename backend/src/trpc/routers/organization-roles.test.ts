import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { db } from "../../db/index.js";
import { organizationFeatureRoles, organizationRoles } from "../../db/schema.js";
import { contextFor, createTestUser } from "../../test/context.js";
import { resetDb } from "../../test/reset-db.js";
import { createCallerFactory, type Context } from "../trpc.js";
import { organizationsRouter } from "./organizations.js";
import { organizationRolesRouter } from "./organization-roles.js";

const createOrgCaller = createCallerFactory(organizationsRouter);
const createCaller = createCallerFactory(organizationRolesRouter);
const noSessionCtx: Context = { session: null };

async function createTestOrg() {
  const owner = await createTestUser({ role: "owner" });
  const caller = createOrgCaller(contextFor(owner));
  const org = await caller.create({ name: `test-org-${randomUUID()}`, blurb: "", initialAdminUserId: owner.id });
  return { owner, org: org! };
}

beforeEach(async () => {
  await resetDb();
});

describe("organizations.roles.list", () => {
  it("rejects an unauthenticated caller", async () => {
    const caller = createCaller(noSessionCtx);
    await expect(caller.list({ organizationId: "irrelevant" })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("rejects a non-member without admin.organizations.update", async () => {
    const { org } = await createTestOrg();
    const outsider = await createTestUser({ role: "standard" });
    const caller = createCaller(contextFor(outsider));
    await expect(caller.list({ organizationId: org.id })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("a plain member can list their own org's roles", async () => {
    const { org } = await createTestOrg();
    const member = await createTestUser({ role: "standard" });
    const ownerCaller = createOrgCaller(contextFor(await createTestUser({ role: "owner" })));
    await ownerCaller.addMember({ organizationId: org.id, userId: member.id });
    const caller = createCaller(contextFor(member));

    const result = await caller.list({ organizationId: org.id });

    expect(result.map((role) => role.name)).toEqual(expect.arrayContaining(["admin", "standard", "viewer"]));
  });

  it("a brand-new organization starts with admin/standard/viewer", async () => {
    const { org } = await createTestOrg();
    const caller = createCaller(contextFor(await createTestUser({ role: "owner" })));

    const result = await caller.list({ organizationId: org.id });

    expect(result.map((role) => role.name).sort()).toEqual(["admin", "standard", "viewer"]);
  });
});

describe("organizations.roles.create", () => {
  it("rejects a caller without admin.organizations.update", async () => {
    const { org } = await createTestOrg();
    const standardUser = await createTestUser({ role: "standard" });
    const caller = createCaller(contextFor(standardUser));
    await expect(caller.create({ organizationId: org.id, name: "manager" })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("rejects a duplicate name within the same org", async () => {
    const { org } = await createTestOrg();
    const owner = await createTestUser({ role: "owner" });
    const caller = createCaller(contextFor(owner));
    await expect(caller.create({ organizationId: org.id, name: "admin" })).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
  });

  it("allows the same role name in two different orgs", async () => {
    const { org: orgA } = await createTestOrg();
    const { org: orgB } = await createTestOrg();
    const owner = await createTestUser({ role: "owner" });
    const caller = createCaller(contextFor(owner));

    const name = `manager-${randomUUID()}`;
    await caller.create({ organizationId: orgA.id, name });
    const result = await caller.create({ organizationId: orgB.id, name });

    expect(result?.name).toBe(name);
  });

  it("a member granted roles.update can create without the global override", async () => {
    const { org, owner } = await createTestOrg();
    const ownerCaller = createOrgCaller(contextFor(owner));
    const member = await createTestUser({ role: "standard" });
    await ownerCaller.addMember({ organizationId: org.id, userId: member.id });
    await db.insert(organizationFeatureRoles).values({
      organizationId: org.id,
      featureKey: "roles.update",
      role: "standard",
      granted: true,
    });
    const memberCaller = createCaller(contextFor(member));
    const name = `manager-${randomUUID()}`;

    const result = await memberCaller.create({ organizationId: org.id, name });

    expect(result?.name).toBe(name);
  });

  it("creates a new role with no grants", async () => {
    const { org } = await createTestOrg();
    const owner = await createTestUser({ role: "owner" });
    const caller = createCaller(contextFor(owner));
    const name = `manager-${randomUUID()}`;

    const result = await caller.create({ organizationId: org.id, name });

    expect(result?.name).toBe(name);
    const [row] = await db
      .select()
      .from(organizationRoles)
      .where(eq(organizationRoles.name, name));
    expect(row).toBeDefined();
  });
});

describe("organizations.roles.delete", () => {
  it("rejects a caller without admin.organizations.update", async () => {
    const { org } = await createTestOrg();
    const standardUser = await createTestUser({ role: "standard" });
    const caller = createCaller(contextFor(standardUser));
    await expect(caller.delete({ organizationId: org.id, name: "admin" })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("refuses to delete admin/standard/viewer", async () => {
    const { org } = await createTestOrg();
    const owner = await createTestUser({ role: "owner" });
    const caller = createCaller(contextFor(owner));
    for (const protectedName of ["admin", "standard", "viewer"]) {
      await expect(caller.delete({ organizationId: org.id, name: protectedName })).rejects.toMatchObject({
        code: "BAD_REQUEST",
      });
    }
  });

  it("refuses to delete a role currently assigned to a member", async () => {
    const { org, owner } = await createTestOrg();
    const caller = createCaller(contextFor(owner));
    // "admin" is already in use by the initial admin -- covered above,
    // this exercises the same guard on a custom role instead.
    const orgCaller = createOrgCaller(contextFor(owner));
    const name = `manager-${randomUUID()}`;
    await caller.create({ organizationId: org.id, name });
    const member = await createTestUser({ role: "standard" });
    await orgCaller.addMember({ organizationId: org.id, userId: member.id });
    await orgCaller.setMemberRole({ organizationId: org.id, userId: member.id, role: name });

    await expect(caller.delete({ organizationId: org.id, name })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("deletes an unused, unprotected role", async () => {
    const { org, owner } = await createTestOrg();
    const caller = createCaller(contextFor(owner));
    const name = `manager-${randomUUID()}`;
    await caller.create({ organizationId: org.id, name });

    await caller.delete({ organizationId: org.id, name });

    const [row] = await db
      .select()
      .from(organizationRoles)
      .where(eq(organizationRoles.name, name));
    expect(row).toBeUndefined();
  });
});
