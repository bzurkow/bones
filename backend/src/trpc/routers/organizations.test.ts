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

describe("organizations.searchUsers", () => {
  it("rejects a caller without application.organizations.create", async () => {
    const standardUser = await createTestUser({ role: "standard" });
    const caller = createCaller(contextFor(standardUser));
    await expect(caller.searchUsers({ search: "x" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("matches by name or email", async () => {
    const owner = await createTestUser({ role: "owner" });
    const caller = createCaller(contextFor(owner));
    const searchTag = randomUUID();
    const match = await createTestUser({ name: `Findable-${searchTag}` });
    await createTestUser({ name: "Someone Else" });

    const result = await caller.searchUsers({ search: searchTag });

    expect(result.map((row) => row.id)).toEqual([match.id]);
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
    expect(members).toEqual([expect.objectContaining({ id: owner.id, role: "admin" })]);
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

describe("organizations.listMembers", () => {
  it("rejects a caller without admin.organizations.view", async () => {
    const standardUser = await createTestUser({ role: "standard" });
    const caller = createCaller(contextFor(standardUser));
    await expect(caller.listMembers({ organizationId: "irrelevant" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("lists only users added to that organization", async () => {
    const owner = await createTestUser({ role: "owner" });
    const caller = createCaller(contextFor(owner));
    const org = await caller.create({ name: `test-org-${randomUUID()}`, blurb: "", initialAdminUserId: owner.id });
    const member = await createTestUser({ name: "Member One" });
    await createTestUser({ name: "Not A Member" });

    await caller.addMember({ organizationId: org!.id, userId: member.id });

    const result = await caller.listMembers({ organizationId: org!.id });
    expect(result.map((row) => row.id)).toEqual(expect.arrayContaining([owner.id, member.id]));
    expect(result).toHaveLength(2);
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
    expect(result).toEqual(expect.arrayContaining([expect.objectContaining({ id: member.id, role: "standard" })]));
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
    expect(result).toHaveLength(2);
  });

  it("removes a member", async () => {
    const owner = await createTestUser({ role: "owner" });
    const caller = createCaller(contextFor(owner));
    const org = await caller.create({ name: `test-org-${randomUUID()}`, blurb: "", initialAdminUserId: owner.id });
    const member = await createTestUser();
    await caller.addMember({ organizationId: org!.id, userId: member.id });

    await caller.removeMember({ organizationId: org!.id, userId: member.id });

    const result = await caller.listMembers({ organizationId: org!.id });
    expect(result.map((row) => row.id)).toEqual([owner.id]);
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
