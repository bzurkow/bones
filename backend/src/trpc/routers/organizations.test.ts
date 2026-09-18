import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { db } from "../../db/index.js";
import { organizationFeatureRoles, organizationRoles, organizationUsers, organizations } from "../../db/schema.js";
import { contextFor, createTestUser } from "../../test/context.js";
import { resetDb } from "../../test/reset-db.js";
import { createCallerFactory, type Context } from "../trpc.js";
import { organizationsRouter } from "./organizations.js";

const createCaller = createCallerFactory(organizationsRouter);
const noSessionCtx: Context = { session: null };

beforeEach(async () => {
  await resetDb();
});

describe("organizations.list", () => {
  it("rejects an unauthenticated caller", async () => {
    const caller = createCaller(noSessionCtx);
    await expect(caller.list()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("rejects a caller without admin.organizations.view", async () => {
    const standardUser = await createTestUser({ role: "standard" });
    const caller = createCaller(contextFor(standardUser));
    await expect(caller.list()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("includes each organization's member count", async () => {
    const owner = await createTestUser({ role: "owner" });
    const caller = createCaller(contextFor(owner));
    const org = await caller.create({ name: `test-org-${randomUUID()}`, blurb: "", initialAdminUserId: owner.id });
    const secondMember = await createTestUser();
    await caller.addMember({ organizationId: org!.id, userId: secondMember.id });

    const result = await caller.list();

    expect(result.find((row) => row.id === org!.id)?.memberCount).toBe(2);
  });
});

describe("organizations.listForCurrentUser", () => {
  it("rejects an unauthenticated caller", async () => {
    const caller = createCaller(noSessionCtx);
    await expect(caller.listForCurrentUser()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("a non-override caller sees only orgs they're a member of", async () => {
    const owner = await createTestUser({ role: "owner" });
    const ownerCaller = createCaller(contextFor(owner));
    const memberOrg = await ownerCaller.create({
      name: `test-org-${randomUUID()}`,
      blurb: "",
      initialAdminUserId: owner.id,
    });
    await ownerCaller.create({ name: `test-org-${randomUUID()}`, blurb: "", initialAdminUserId: owner.id });

    const standardUser = await createTestUser({ role: "standard" });
    await ownerCaller.addMember({ organizationId: memberOrg!.id, userId: standardUser.id });
    const standardCaller = createCaller(contextFor(standardUser));

    const result = await standardCaller.listForCurrentUser();

    expect(result.map((row) => row.id)).toEqual([memberOrg!.id]);
  });

  it("a caller with admin.organizations.update sees every org, member or not", async () => {
    const owner = await createTestUser({ role: "owner" });
    const caller = createCaller(contextFor(owner));
    const orgA = await caller.create({ name: `test-org-${randomUUID()}`, blurb: "", initialAdminUserId: owner.id });
    const orgB = await caller.create({ name: `test-org-${randomUUID()}`, blurb: "", initialAdminUserId: owner.id });

    const result = await caller.listForCurrentUser();

    expect(result.map((row) => row.id)).toEqual(expect.arrayContaining([orgA!.id, orgB!.id]));
  });
});

describe("organizations.getByName", () => {
  it("rejects an unauthenticated caller", async () => {
    const caller = createCaller(noSessionCtx);
    await expect(caller.getByName({ name: "irrelevant" })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("404s on an unknown name", async () => {
    const owner = await createTestUser({ role: "owner" });
    const caller = createCaller(contextFor(owner));
    await expect(caller.getByName({ name: `unknown-${randomUUID()}` })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("matches case-insensitively", async () => {
    const owner = await createTestUser({ role: "owner" });
    const caller = createCaller(contextFor(owner));
    const name = `Test-Org-${randomUUID()}`;
    await caller.create({ name, blurb: "", initialAdminUserId: owner.id });

    const result = await caller.getByName({ name: name.toUpperCase() });

    expect(result.name).toBe(name);
  });

  it("rejects a non-member without admin.organizations.update", async () => {
    const owner = await createTestUser({ role: "owner" });
    const ownerCaller = createCaller(contextFor(owner));
    const org = await ownerCaller.create({ name: `test-org-${randomUUID()}`, blurb: "", initialAdminUserId: owner.id });

    const outsider = await createTestUser({ role: "standard" });
    const outsiderCaller = createCaller(contextFor(outsider));

    await expect(outsiderCaller.getByName({ name: org!.name })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("a plain member can view, but every canUpdate* flag is false", async () => {
    const owner = await createTestUser({ role: "owner" });
    const ownerCaller = createCaller(contextFor(owner));
    const org = await ownerCaller.create({ name: `test-org-${randomUUID()}`, blurb: "", initialAdminUserId: owner.id });

    const member = await createTestUser({ role: "standard" });
    await ownerCaller.addMember({ organizationId: org!.id, userId: member.id });
    const memberCaller = createCaller(contextFor(member));

    const result = await memberCaller.getByName({ name: org!.name });

    expect(result.id).toBe(org!.id);
    expect(result.canUpdateProfile).toBe(false);
    expect(result.canUpdateMembers).toBe(false);
    expect(result.canUpdateRoles).toBe(false);
    expect(result.canUpdatePermissions).toBe(false);
  });

  it("the initial admin can view and update every tab", async () => {
    const owner = await createTestUser({ role: "owner" });
    const ownerCaller = createCaller(contextFor(owner));
    const org = await ownerCaller.create({ name: `test-org-${randomUUID()}`, blurb: "", initialAdminUserId: owner.id });

    const result = await ownerCaller.getByName({ name: org!.name });

    expect(result.canUpdateProfile).toBe(true);
    expect(result.canUpdateMembers).toBe(true);
    expect(result.canUpdateRoles).toBe(true);
    expect(result.canUpdatePermissions).toBe(true);
  });

  it("a non-member with admin.organizations.update can view and update every tab", async () => {
    const owner = await createTestUser({ role: "owner" });
    const ownerCaller = createCaller(contextFor(owner));
    const org = await ownerCaller.create({ name: `test-org-${randomUUID()}`, blurb: "", initialAdminUserId: owner.id });

    const otherOwner = await createTestUser({ role: "owner" });
    const otherOwnerCaller = createCaller(contextFor(otherOwner));

    const result = await otherOwnerCaller.getByName({ name: org!.name });

    expect(result.id).toBe(org!.id);
    expect(result.canUpdateProfile).toBe(true);
    expect(result.canUpdateMembers).toBe(true);
    expect(result.canUpdateRoles).toBe(true);
    expect(result.canUpdatePermissions).toBe(true);
  });

  it("a member granted only members.update can update members but not profile", async () => {
    const owner = await createTestUser({ role: "owner" });
    const ownerCaller = createCaller(contextFor(owner));
    const org = await ownerCaller.create({ name: `test-org-${randomUUID()}`, blurb: "", initialAdminUserId: owner.id });

    const member = await createTestUser({ role: "standard" });
    await ownerCaller.addMember({ organizationId: org!.id, userId: member.id });
    await db.insert(organizationFeatureRoles).values({
      organizationId: org!.id,
      featureKey: "members.update",
      role: "standard",
      granted: true,
    });
    const memberCaller = createCaller(contextFor(member));

    const result = await memberCaller.getByName({ name: org!.name });

    expect(result.canUpdateMembers).toBe(true);
    expect(result.canUpdateProfile).toBe(false);
  });
});

describe("organizations.create", () => {
  it("rejects a caller without application.organizations.create", async () => {
    const standardUser = await createTestUser({ role: "standard" });
    const caller = createCaller(contextFor(standardUser));
    await expect(
      caller.create({ name: "irrelevant", blurb: "", initialAdminUserId: standardUser.id }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("rejects an unknown initial admin", async () => {
    const owner = await createTestUser({ role: "owner" });
    const caller = createCaller(contextFor(owner));
    await expect(
      caller.create({ name: "irrelevant", blurb: "", initialAdminUserId: randomUUID() }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("rejects a name that already exists, case-insensitively", async () => {
    const owner = await createTestUser({ role: "owner" });
    const caller = createCaller(contextFor(owner));
    const name = `Test-Org-${randomUUID()}`;
    await caller.create({ name, blurb: "", initialAdminUserId: owner.id });

    await expect(
      caller.create({ name: name.toUpperCase(), blurb: "", initialAdminUserId: owner.id }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("creates a new organization, active by default, with the given user as admin", async () => {
    const owner = await createTestUser({ role: "owner" });
    const caller = createCaller(contextFor(owner));
    const name = `test-org-${randomUUID()}`;

    const result = await caller.create({ name, blurb: "A blurb.", initialAdminUserId: owner.id });

    expect(result?.name).toBe(name);
    expect(result?.blurb).toBe("A blurb.");
    expect(result?.active).toBe(true);
    const [row] = await db.select().from(organizations).where(eq(organizations.id, result!.id));
    expect(row).toBeDefined();

    const members = await caller.listMembers({ organizationId: result!.id });
    expect(members.members).toEqual([expect.objectContaining({ id: owner.id, role: "admin" })]);
  });

  it("seeds admin/standard/viewer organization_roles for a new org", async () => {
    const owner = await createTestUser({ role: "owner" });
    const caller = createCaller(contextFor(owner));

    const result = await caller.create({ name: `test-org-${randomUUID()}`, blurb: "", initialAdminUserId: owner.id });

    const roleRows = await db.select().from(organizationRoles).where(eq(organizationRoles.organizationId, result!.id));
    expect(roleRows.map((row) => row.name).sort()).toEqual(["admin", "standard", "viewer"]);
  });
});

describe("organizations.update", () => {
  it("rejects a caller who's neither a member nor holds admin.organizations.update", async () => {
    const standardUser = await createTestUser({ role: "standard" });
    const caller = createCaller(contextFor(standardUser));
    await expect(caller.update({ organizationId: "irrelevant", name: "x", blurb: "" })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("404s on an unknown id", async () => {
    const owner = await createTestUser({ role: "owner" });
    const caller = createCaller(contextFor(owner));
    await expect(caller.update({ organizationId: randomUUID(), name: "x", blurb: "" })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("rejects renaming to a name that already exists, case-insensitively", async () => {
    const owner = await createTestUser({ role: "owner" });
    const caller = createCaller(contextFor(owner));
    const takenName = `Test-Org-${randomUUID()}`;
    await caller.create({ name: takenName, blurb: "", initialAdminUserId: owner.id });
    const org = await caller.create({ name: `test-org-${randomUUID()}`, blurb: "", initialAdminUserId: owner.id });

    await expect(
      caller.update({ organizationId: org!.id, name: takenName.toUpperCase(), blurb: "" }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("allows updating an organization's own name to itself (no-op rename)", async () => {
    const owner = await createTestUser({ role: "owner" });
    const caller = createCaller(contextFor(owner));
    const org = await caller.create({
      name: `test-org-${randomUUID()}`,
      blurb: "Before.",
      initialAdminUserId: owner.id,
    });

    const result = await caller.update({ organizationId: org!.id, name: org!.name, blurb: "After." });

    expect(result?.blurb).toBe("After.");
  });

  it("updates name and blurb", async () => {
    const owner = await createTestUser({ role: "owner" });
    const caller = createCaller(contextFor(owner));
    const created = await caller.create({
      name: `test-org-${randomUUID()}`,
      blurb: "Before.",
      initialAdminUserId: owner.id,
    });

    const updatedName = `test-org-${randomUUID()}`;
    const result = await caller.update({ organizationId: created!.id, name: updatedName, blurb: "After." });

    expect(result?.name).toBe(updatedName);
    expect(result?.blurb).toBe("After.");
  });

  it("a member granted profile.update can update without the global override", async () => {
    const owner = await createTestUser({ role: "owner" });
    const ownerCaller = createCaller(contextFor(owner));
    const org = await ownerCaller.create({ name: `test-org-${randomUUID()}`, blurb: "", initialAdminUserId: owner.id });

    const member = await createTestUser({ role: "standard" });
    await ownerCaller.addMember({ organizationId: org!.id, userId: member.id });
    await db.insert(organizationFeatureRoles).values({
      organizationId: org!.id,
      featureKey: "profile.update",
      role: "standard",
      granted: true,
    });
    const memberCaller = createCaller(contextFor(member));

    const result = await memberCaller.update({
      organizationId: org!.id,
      name: org!.name,
      blurb: "Updated by a member.",
    });

    expect(result?.blurb).toBe("Updated by a member.");
  });
});

describe("organizations.setActive", () => {
  it("rejects a caller who's neither a member nor holds admin.organizations.update", async () => {
    const standardUser = await createTestUser({ role: "standard" });
    const caller = createCaller(contextFor(standardUser));
    await expect(caller.setActive({ organizationId: "irrelevant", active: false })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("404s on an unknown id", async () => {
    const owner = await createTestUser({ role: "owner" });
    const caller = createCaller(contextFor(owner));
    await expect(caller.setActive({ organizationId: randomUUID(), active: false })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("toggles active", async () => {
    const owner = await createTestUser({ role: "owner" });
    const caller = createCaller(contextFor(owner));
    const created = await caller.create({ name: `test-org-${randomUUID()}`, blurb: "", initialAdminUserId: owner.id });

    const result = await caller.setActive({ organizationId: created!.id, active: false });

    expect(result?.active).toBe(false);
  });
});

describe("organizations.requestAvatarUpload / confirmAvatarUpload", () => {
  it("rejects a caller who's neither a member nor holds admin.organizations.update", async () => {
    const standardUser = await createTestUser({ role: "standard" });
    const caller = createCaller(contextFor(standardUser));
    await expect(
      caller.requestAvatarUpload({ organizationId: "irrelevant", contentType: "image/png" }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.confirmAvatarUpload({ organizationId: "irrelevant", key: "irrelevant" })).rejects.toMatchObject(
      { code: "FORBIDDEN" },
    );
  });

  it("rejects confirming a key that doesn't belong to this organization", async () => {
    const owner = await createTestUser({ role: "owner" });
    const caller = createCaller(contextFor(owner));
    const org = await caller.create({ name: `test-org-${randomUUID()}`, blurb: "", initialAdminUserId: owner.id });

    await expect(
      caller.confirmAvatarUpload({ organizationId: org!.id, key: `org/${randomUUID()}/x.png` }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("issues an upload URL keyed by organizationId", async () => {
    const owner = await createTestUser({ role: "owner" });
    const caller = createCaller(contextFor(owner));
    const org = await caller.create({ name: `test-org-${randomUUID()}`, blurb: "", initialAdminUserId: owner.id });

    const result = await caller.requestAvatarUpload({ organizationId: org!.id, contentType: "image/png" });

    expect(result.key.startsWith(`org/${org!.id}/`)).toBe(true);
    expect(result.uploadUrl).toEqual(expect.any(String));
  });
});

describe("organizations.listMembers", () => {
  it("rejects a caller without membership or admin.organizations.update", async () => {
    const owner = await createTestUser({ role: "owner" });
    const ownerCaller = createCaller(contextFor(owner));
    const org = await ownerCaller.create({ name: `test-org-${randomUUID()}`, blurb: "", initialAdminUserId: owner.id });

    const outsider = await createTestUser({ role: "standard" });
    const outsiderCaller = createCaller(contextFor(outsider));

    await expect(outsiderCaller.listMembers({ organizationId: org!.id })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("a plain member can list members of their own org", async () => {
    const owner = await createTestUser({ role: "owner" });
    const ownerCaller = createCaller(contextFor(owner));
    const org = await ownerCaller.create({ name: `test-org-${randomUUID()}`, blurb: "", initialAdminUserId: owner.id });
    const member = await createTestUser({ name: "Member One", role: "standard" });
    await ownerCaller.addMember({ organizationId: org!.id, userId: member.id });
    const memberCaller = createCaller(contextFor(member));

    const result = await memberCaller.listMembers({ organizationId: org!.id });

    expect(result.members.map((row) => row.id)).toEqual(expect.arrayContaining([owner.id, member.id]));
    expect(result.total).toBe(2);
  });

  it("lists only members of that organization", async () => {
    const owner = await createTestUser({ role: "owner" });
    const caller = createCaller(contextFor(owner));
    const org = await caller.create({ name: `test-org-${randomUUID()}`, blurb: "", initialAdminUserId: owner.id });
    const member = await createTestUser({ name: "Member One" });
    await createTestUser({ name: "Not A Member" });

    await caller.addMember({ organizationId: org!.id, userId: member.id });

    const result = await caller.listMembers({ organizationId: org!.id });
    expect(result.members.map((row) => row.id)).toEqual(expect.arrayContaining([owner.id, member.id]));
    expect(result.total).toBe(2);
  });

  it("filters by search", async () => {
    const owner = await createTestUser({ role: "owner" });
    const caller = createCaller(contextFor(owner));
    const org = await caller.create({ name: `test-org-${randomUUID()}`, blurb: "", initialAdminUserId: owner.id });
    const searchTag = randomUUID();
    const match = await createTestUser({ name: `Findable-${searchTag}` });
    await caller.addMember({ organizationId: org!.id, userId: match.id });

    const result = await caller.listMembers({ organizationId: org!.id, search: searchTag });

    expect(result.members.map((row) => row.id)).toEqual([match.id]);
    expect(result.total).toBe(1);
  });
});

describe("organizations.findAddableUserByEmail", () => {
  it("rejects a caller who's neither a member nor holds admin.organizations.update", async () => {
    const standardUser = await createTestUser({ role: "standard" });
    const caller = createCaller(contextFor(standardUser));
    await expect(
      caller.findAddableUserByEmail({ organizationId: "irrelevant", email: "someone@example.test" }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("rejects a non-email string", async () => {
    const owner = await createTestUser({ role: "owner" });
    const caller = createCaller(contextFor(owner));
    const org = await caller.create({ name: `test-org-${randomUUID()}`, blurb: "", initialAdminUserId: owner.id });

    await expect(
      caller.findAddableUserByEmail({ organizationId: org!.id, email: "not-an-email" }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("returns null for an email that matches no user", async () => {
    const owner = await createTestUser({ role: "owner" });
    const caller = createCaller(contextFor(owner));
    const org = await caller.create({ name: `test-org-${randomUUID()}`, blurb: "", initialAdminUserId: owner.id });

    const result = await caller.findAddableUserByEmail({
      organizationId: org!.id,
      email: `${randomUUID()}@example.test`,
    });

    expect(result).toBeNull();
  });

  it("finds an exact match, case-insensitively", async () => {
    const owner = await createTestUser({ role: "owner" });
    const caller = createCaller(contextFor(owner));
    const org = await caller.create({ name: `test-org-${randomUUID()}`, blurb: "", initialAdminUserId: owner.id });
    const email = `${randomUUID()}@Example.test`;
    const target = await createTestUser({ email });

    const result = await caller.findAddableUserByEmail({ organizationId: org!.id, email: email.toUpperCase() });

    expect(result?.id).toBe(target.id);
  });

  it("does not match on a partial address -- exact match only, not a substring search", async () => {
    const owner = await createTestUser({ role: "owner" });
    const caller = createCaller(contextFor(owner));
    const org = await caller.create({ name: `test-org-${randomUUID()}`, blurb: "", initialAdminUserId: owner.id });
    const localPart = randomUUID();
    await createTestUser({ email: `${localPart}@example.test` });

    // A real, differently-shaped email that happens to contain the same
    // local part as a substring -- must not match, unlike the old
    // ilike-based search this replaced.
    const result = await caller.findAddableUserByEmail({
      organizationId: org!.id,
      email: `prefix-${localPart}@example.test`,
    });

    expect(result).toBeNull();
  });

  it("returns null for an existing member (nothing to add)", async () => {
    const owner = await createTestUser({ role: "owner" });
    const caller = createCaller(contextFor(owner));
    const org = await caller.create({ name: `test-org-${randomUUID()}`, blurb: "", initialAdminUserId: owner.id });
    const email = `${randomUUID()}@example.test`;
    const member = await createTestUser({ email });
    await caller.addMember({ organizationId: org!.id, userId: member.id });

    const result = await caller.findAddableUserByEmail({ organizationId: org!.id, email });

    expect(result).toBeNull();
  });

  it("finds a previously-removed member again -- removal is a soft delete, not a real one", async () => {
    const owner = await createTestUser({ role: "owner" });
    const caller = createCaller(contextFor(owner));
    const org = await caller.create({ name: `test-org-${randomUUID()}`, blurb: "", initialAdminUserId: owner.id });
    const email = `${randomUUID()}@example.test`;
    const member = await createTestUser({ email });
    await caller.addMember({ organizationId: org!.id, userId: member.id });
    await caller.removeMember({ organizationId: org!.id, userId: member.id });

    const result = await caller.findAddableUserByEmail({ organizationId: org!.id, email });

    expect(result?.id).toBe(member.id);
  });
});

describe("organizations.addMember / removeMember", () => {
  it("rejects a caller who's neither a member nor holds admin.organizations.update", async () => {
    const standardUser = await createTestUser({ role: "standard" });
    const caller = createCaller(contextFor(standardUser));
    await expect(caller.addMember({ organizationId: "irrelevant", userId: "irrelevant" })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    await expect(caller.removeMember({ organizationId: "irrelevant", userId: "irrelevant" })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("adds a member as standard by default", async () => {
    const owner = await createTestUser({ role: "owner" });
    const caller = createCaller(contextFor(owner));
    const org = await caller.create({ name: `test-org-${randomUUID()}`, blurb: "", initialAdminUserId: owner.id });
    const member = await createTestUser();

    await caller.addMember({ organizationId: org!.id, userId: member.id });

    const result = await caller.listMembers({ organizationId: org!.id });
    expect(result.members).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: member.id, role: "standard" })]),
    );
  });

  it("adding twice is a no-op, not an error", async () => {
    const owner = await createTestUser({ role: "owner" });
    const caller = createCaller(contextFor(owner));
    const org = await caller.create({ name: `test-org-${randomUUID()}`, blurb: "", initialAdminUserId: owner.id });
    const member = await createTestUser();

    await caller.addMember({ organizationId: org!.id, userId: member.id });
    await caller.addMember({ organizationId: org!.id, userId: member.id });

    const result = await caller.listMembers({ organizationId: org!.id });
    // owner (initial admin) + member, no duplicate row for member.
    expect(result.total).toBe(2);
  });

  it("removes a member", async () => {
    const owner = await createTestUser({ role: "owner" });
    const caller = createCaller(contextFor(owner));
    const org = await caller.create({ name: `test-org-${randomUUID()}`, blurb: "", initialAdminUserId: owner.id });
    const member = await createTestUser();
    await caller.addMember({ organizationId: org!.id, userId: member.id });

    await caller.removeMember({ organizationId: org!.id, userId: member.id });

    const result = await caller.listMembers({ organizationId: org!.id });
    expect(result.members.map((row) => row.id)).toEqual([owner.id]);
  });

  it("removal is a soft delete -- the row survives, just inactive", async () => {
    const owner = await createTestUser({ role: "owner" });
    const caller = createCaller(contextFor(owner));
    const org = await caller.create({ name: `test-org-${randomUUID()}`, blurb: "", initialAdminUserId: owner.id });
    const member = await createTestUser();
    await caller.addMember({ organizationId: org!.id, userId: member.id });

    await caller.removeMember({ organizationId: org!.id, userId: member.id });

    const [row] = await db
      .select()
      .from(organizationUsers)
      .where(and(eq(organizationUsers.organizationId, org!.id), eq(organizationUsers.userId, member.id)));
    expect(row).toMatchObject({ active: false });
  });

  it("re-adding a removed member reactivates them, reset to standard", async () => {
    const owner = await createTestUser({ role: "owner" });
    const caller = createCaller(contextFor(owner));
    const org = await caller.create({ name: `test-org-${randomUUID()}`, blurb: "", initialAdminUserId: owner.id });
    const member = await createTestUser();
    await caller.addMember({ organizationId: org!.id, userId: member.id });
    await caller.setMemberRole({ organizationId: org!.id, userId: member.id, role: "admin" });
    await caller.removeMember({ organizationId: org!.id, userId: member.id });

    await caller.addMember({ organizationId: org!.id, userId: member.id });

    const result = await caller.listMembers({ organizationId: org!.id });
    expect(result.members).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: member.id, role: "standard" })]),
    );
  });

  it("rejects removing the organization's last active admin", async () => {
    const owner = await createTestUser({ role: "owner" });
    const caller = createCaller(contextFor(owner));
    const org = await caller.create({ name: `test-org-${randomUUID()}`, blurb: "", initialAdminUserId: owner.id });

    await expect(caller.removeMember({ organizationId: org!.id, userId: owner.id })).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
  });

  it("allows removing an admin once a second active admin exists", async () => {
    const owner = await createTestUser({ role: "owner" });
    const caller = createCaller(contextFor(owner));
    const org = await caller.create({ name: `test-org-${randomUUID()}`, blurb: "", initialAdminUserId: owner.id });
    const secondAdmin = await createTestUser();
    await caller.addMember({ organizationId: org!.id, userId: secondAdmin.id });
    await caller.setMemberRole({ organizationId: org!.id, userId: secondAdmin.id, role: "admin" });

    await expect(caller.removeMember({ organizationId: org!.id, userId: owner.id })).resolves.toBeDefined();
  });

  it("a member granted members.update can add/remove without the global override", async () => {
    const owner = await createTestUser({ role: "owner" });
    const ownerCaller = createCaller(contextFor(owner));
    const org = await ownerCaller.create({ name: `test-org-${randomUUID()}`, blurb: "", initialAdminUserId: owner.id });

    const granted = await createTestUser({ role: "standard" });
    await ownerCaller.addMember({ organizationId: org!.id, userId: granted.id });
    await db.insert(organizationFeatureRoles).values({
      organizationId: org!.id,
      featureKey: "members.update",
      role: "standard",
      granted: true,
    });
    const grantedCaller = createCaller(contextFor(granted));

    const newMember = await createTestUser();
    await grantedCaller.addMember({ organizationId: org!.id, userId: newMember.id });
    await grantedCaller.removeMember({ organizationId: org!.id, userId: newMember.id });

    const result = await grantedCaller.listMembers({ organizationId: org!.id });
    expect(result.members.map((row) => row.id)).toEqual(expect.arrayContaining([owner.id, granted.id]));
    expect(result.members.map((row) => row.id)).not.toContain(newMember.id);
  });
});

describe("organizations.setMemberRole", () => {
  it("rejects a caller who's neither a member nor holds admin.organizations.update", async () => {
    const standardUser = await createTestUser({ role: "standard" });
    const caller = createCaller(contextFor(standardUser));
    await expect(
      caller.setMemberRole({ organizationId: "irrelevant", userId: "irrelevant", role: "admin" }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("404s on a non-member", async () => {
    const owner = await createTestUser({ role: "owner" });
    const caller = createCaller(contextFor(owner));
    const org = await caller.create({ name: `test-org-${randomUUID()}`, blurb: "", initialAdminUserId: owner.id });
    const nonMember = await createTestUser();

    await expect(
      caller.setMemberRole({ organizationId: org!.id, userId: nonMember.id, role: "admin" }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("promotes a member to admin", async () => {
    const owner = await createTestUser({ role: "owner" });
    const caller = createCaller(contextFor(owner));
    const org = await caller.create({ name: `test-org-${randomUUID()}`, blurb: "", initialAdminUserId: owner.id });
    const member = await createTestUser();
    await caller.addMember({ organizationId: org!.id, userId: member.id });

    const result = await caller.setMemberRole({ organizationId: org!.id, userId: member.id, role: "admin" });

    expect(result?.role).toBe("admin");
  });

  it("assigns the seeded viewer role too, not just admin/standard", async () => {
    const owner = await createTestUser({ role: "owner" });
    const caller = createCaller(contextFor(owner));
    const org = await caller.create({ name: `test-org-${randomUUID()}`, blurb: "", initialAdminUserId: owner.id });
    const member = await createTestUser();
    await caller.addMember({ organizationId: org!.id, userId: member.id });

    const result = await caller.setMemberRole({ organizationId: org!.id, userId: member.id, role: "viewer" });

    expect(result?.role).toBe("viewer");
  });

  it("rejects a role that doesn't exist for this org", async () => {
    const owner = await createTestUser({ role: "owner" });
    const caller = createCaller(contextFor(owner));
    const org = await caller.create({ name: `test-org-${randomUUID()}`, blurb: "", initialAdminUserId: owner.id });
    const member = await createTestUser();
    await caller.addMember({ organizationId: org!.id, userId: member.id });

    await expect(
      caller.setMemberRole({ organizationId: org!.id, userId: member.id, role: `not-a-role-${randomUUID()}` }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("rejects demoting the organization's last active admin", async () => {
    const owner = await createTestUser({ role: "owner" });
    const caller = createCaller(contextFor(owner));
    const org = await caller.create({ name: `test-org-${randomUUID()}`, blurb: "", initialAdminUserId: owner.id });

    await expect(
      caller.setMemberRole({ organizationId: org!.id, userId: owner.id, role: "standard" }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("allows demoting an admin once a second active admin exists", async () => {
    const owner = await createTestUser({ role: "owner" });
    const caller = createCaller(contextFor(owner));
    const org = await caller.create({ name: `test-org-${randomUUID()}`, blurb: "", initialAdminUserId: owner.id });
    const secondAdmin = await createTestUser();
    await caller.addMember({ organizationId: org!.id, userId: secondAdmin.id });
    await caller.setMemberRole({ organizationId: org!.id, userId: secondAdmin.id, role: "admin" });

    const result = await caller.setMemberRole({ organizationId: org!.id, userId: owner.id, role: "standard" });

    expect(result?.role).toBe("standard");
  });

  it("re-promoting to admin is never blocked by the last-admin guard", async () => {
    const owner = await createTestUser({ role: "owner" });
    const caller = createCaller(contextFor(owner));
    const org = await caller.create({ name: `test-org-${randomUUID()}`, blurb: "", initialAdminUserId: owner.id });

    // A no-op "demote" that isn't actually a demotion (already admin ->
    // admin) shouldn't count as the one exception, but assigning admin
    // itself should never be blocked regardless -- there's no way
    // granting MORE admin standing could leave zero active admins.
    const result = await caller.setMemberRole({ organizationId: org!.id, userId: owner.id, role: "admin" });

    expect(result?.role).toBe("admin");
  });

  it("a deactivated admin's account doesn't count -- demoting the only real active admin is still blocked", async () => {
    const owner = await createTestUser({ role: "owner" });
    const caller = createCaller(contextFor(owner));
    const org = await caller.create({ name: `test-org-${randomUUID()}`, blurb: "", initialAdminUserId: owner.id });
    const deactivatedAdmin = await createTestUser({ active: false });
    await caller.addMember({ organizationId: org!.id, userId: deactivatedAdmin.id });
    await caller.setMemberRole({ organizationId: org!.id, userId: deactivatedAdmin.id, role: "admin" });

    // Two "admin" rows exist, but only the owner's account is active --
    // demoting the owner would still leave zero active admins.
    await expect(
      caller.setMemberRole({ organizationId: org!.id, userId: owner.id, role: "standard" }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});
