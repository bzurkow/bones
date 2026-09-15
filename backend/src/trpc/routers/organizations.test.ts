import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { db } from "../../db/index.js";
import { organizations } from "../../db/schema.js";
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

  it("a member can view without admin.organizations.update, but canEdit is false", async () => {
    const owner = await createTestUser({ role: "owner" });
    const ownerCaller = createCaller(contextFor(owner));
    const org = await ownerCaller.create({ name: `test-org-${randomUUID()}`, blurb: "", initialAdminUserId: owner.id });

    const member = await createTestUser({ role: "standard" });
    await ownerCaller.addMember({ organizationId: org!.id, userId: member.id });
    const memberCaller = createCaller(contextFor(member));

    const result = await memberCaller.getByName({ name: org!.name });

    expect(result.id).toBe(org!.id);
    expect(result.canEdit).toBe(false);
  });

  it("a non-member with admin.organizations.update can view, and canEdit is true", async () => {
    const owner = await createTestUser({ role: "owner" });
    const ownerCaller = createCaller(contextFor(owner));
    const org = await ownerCaller.create({ name: `test-org-${randomUUID()}`, blurb: "", initialAdminUserId: owner.id });

    const otherOwner = await createTestUser({ role: "owner" });
    const otherOwnerCaller = createCaller(contextFor(otherOwner));

    const result = await otherOwnerCaller.getByName({ name: org!.name });

    expect(result.id).toBe(org!.id);
    expect(result.canEdit).toBe(true);
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
});

describe("organizations.update", () => {
  it("rejects a caller without admin.organizations.update", async () => {
    const standardUser = await createTestUser({ role: "standard" });
    const caller = createCaller(contextFor(standardUser));
    await expect(caller.update({ id: "irrelevant", name: "x", blurb: "" })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("404s on an unknown id", async () => {
    const owner = await createTestUser({ role: "owner" });
    const caller = createCaller(contextFor(owner));
    await expect(caller.update({ id: randomUUID(), name: "x", blurb: "" })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("rejects renaming to a name that already exists, case-insensitively", async () => {
    const owner = await createTestUser({ role: "owner" });
    const caller = createCaller(contextFor(owner));
    const takenName = `Test-Org-${randomUUID()}`;
    await caller.create({ name: takenName, blurb: "", initialAdminUserId: owner.id });
    const org = await caller.create({ name: `test-org-${randomUUID()}`, blurb: "", initialAdminUserId: owner.id });

    await expect(caller.update({ id: org!.id, name: takenName.toUpperCase(), blurb: "" })).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
  });

  it("allows updating an organization's own name to itself (no-op rename)", async () => {
    const owner = await createTestUser({ role: "owner" });
    const caller = createCaller(contextFor(owner));
    const org = await caller.create({ name: `test-org-${randomUUID()}`, blurb: "Before.", initialAdminUserId: owner.id });

    const result = await caller.update({ id: org!.id, name: org!.name, blurb: "After." });

    expect(result?.blurb).toBe("After.");
  });

  it("updates name and blurb", async () => {
    const owner = await createTestUser({ role: "owner" });
    const caller = createCaller(contextFor(owner));
    const created = await caller.create({ name: `test-org-${randomUUID()}`, blurb: "Before.", initialAdminUserId: owner.id });

    const updatedName = `test-org-${randomUUID()}`;
    const result = await caller.update({ id: created!.id, name: updatedName, blurb: "After." });

    expect(result?.name).toBe(updatedName);
    expect(result?.blurb).toBe("After.");
  });
});

describe("organizations.setActive", () => {
  it("rejects a caller without admin.organizations.update", async () => {
    const standardUser = await createTestUser({ role: "standard" });
    const caller = createCaller(contextFor(standardUser));
    await expect(caller.setActive({ id: "irrelevant", active: false })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("404s on an unknown id", async () => {
    const owner = await createTestUser({ role: "owner" });
    const caller = createCaller(contextFor(owner));
    await expect(caller.setActive({ id: randomUUID(), active: false })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("toggles active", async () => {
    const owner = await createTestUser({ role: "owner" });
    const caller = createCaller(contextFor(owner));
    const created = await caller.create({ name: `test-org-${randomUUID()}`, blurb: "", initialAdminUserId: owner.id });

    const result = await caller.setActive({ id: created!.id, active: false });

    expect(result?.active).toBe(false);
  });
});

describe("organizations.requestAvatarUpload / confirmAvatarUpload", () => {
  it("rejects a caller without admin.organizations.update", async () => {
    const standardUser = await createTestUser({ role: "standard" });
    const caller = createCaller(contextFor(standardUser));
    await expect(
      caller.requestAvatarUpload({ organizationId: "irrelevant", contentType: "image/png" }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(
      caller.confirmAvatarUpload({ organizationId: "irrelevant", key: "irrelevant" }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
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

describe("organizations.searchAddableUsers", () => {
  it("rejects a caller without admin.organizations.update", async () => {
    const standardUser = await createTestUser({ role: "standard" });
    const caller = createCaller(contextFor(standardUser));
    await expect(
      caller.searchAddableUsers({ organizationId: "irrelevant", search: "x" }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("excludes existing members from the results", async () => {
    const owner = await createTestUser({ role: "owner" });
    const caller = createCaller(contextFor(owner));
    const org = await caller.create({ name: `test-org-${randomUUID()}`, blurb: "", initialAdminUserId: owner.id });
    const searchTag = randomUUID();
    const member = await createTestUser({ name: `Findable-${searchTag} Member` });
    const nonMember = await createTestUser({ name: `Findable-${searchTag} Stranger` });
    await caller.addMember({ organizationId: org!.id, userId: member.id });

    const result = await caller.searchAddableUsers({ organizationId: org!.id, search: searchTag });

    expect(result.map((row) => row.id)).toEqual([nonMember.id]);
  });
});

describe("organizations.addMember / removeMember", () => {
  it("rejects a caller without admin.organizations.update", async () => {
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
});

describe("organizations.setMemberRole", () => {
  it("rejects a caller without admin.organizations.update", async () => {
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
});
