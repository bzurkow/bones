import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { db } from "../../db/index.js";
import { roles } from "../../db/schema.js";
import { contextFor, createTestUser } from "../../test/context.js";
import { resetDb } from "../../test/reset-db.js";
import { createCallerFactory, type Context } from "../trpc.js";
import { rolesRouter } from "./roles.js";

const createCaller = createCallerFactory(rolesRouter);
const noSessionCtx: Context = { session: null };

beforeEach(async () => {
  await resetDb();
});

describe("roles.list", () => {
  it("rejects an unauthenticated caller", async () => {
    const caller = createCaller(noSessionCtx);
    await expect(caller.list()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("is readable by any signed-in user, no specific permission needed", async () => {
    const standardUser = await createTestUser({ role: "standard" });
    const caller = createCaller(contextFor(standardUser));

    const result = await caller.list();

    expect(result.map((role) => role.name)).toEqual(
      expect.arrayContaining(["owner", "administrator", "standard", "demo"]),
    );
  });
});

describe("roles.create", () => {
  it("rejects a caller without admin.roles.create", async () => {
    const standardUser = await createTestUser({ role: "standard" });
    const caller = createCaller(contextFor(standardUser));
    await expect(caller.create({ name: "irrelevant" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("creates a new role with no grants", async () => {
    const owner = await createTestUser({ role: "owner" });
    const caller = createCaller(contextFor(owner));
    const name = `test-role-${randomUUID()}`;

    const result = await caller.create({ name });

    expect(result?.name).toBe(name);
    const [row] = await db.select().from(roles).where(eq(roles.name, name));
    expect(row).toBeDefined();

    // Not part of the seeded baseline -- clean up so it doesn't leak into
    // whatever test runs after this one (roles isn't truncated between
    // tests, see reset-db.ts's own comment on why auth_protocols isn't
    // either).
    await db.delete(roles).where(eq(roles.name, name));
  });

  it("rejects a duplicate name", async () => {
    const owner = await createTestUser({ role: "owner" });
    const caller = createCaller(contextFor(owner));
    await expect(caller.create({ name: "owner" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});

describe("roles.delete", () => {
  it("rejects a caller without admin.roles.delete", async () => {
    const standardUser = await createTestUser({ role: "standard" });
    const caller = createCaller(contextFor(standardUser));
    await expect(caller.delete({ name: "owner" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("refuses to delete the owner role", async () => {
    const owner = await createTestUser({ role: "owner" });
    const caller = createCaller(contextFor(owner));
    await expect(caller.delete({ name: "owner" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("refuses to delete the standard role", async () => {
    const owner = await createTestUser({ role: "owner" });
    const caller = createCaller(contextFor(owner));
    await expect(caller.delete({ name: "standard" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("refuses to delete a role currently assigned to a user", async () => {
    const owner = await createTestUser({ role: "owner" });
    const caller = createCaller(contextFor(owner));
    const name = `test-role-${randomUUID()}`;
    await db.insert(roles).values({ name });
    await createTestUser({ role: name });

    await expect(caller.delete({ name })).rejects.toMatchObject({ code: "BAD_REQUEST" });

    // Deliberately not cleaned up here -- the referencing user (and this
    // role's FK, which has no onDelete) means deleting it now would just
    // fail; the next test's resetDb() truncates the user, leaving this
    // role orphaned but harmless (uniquely named, never collides, and the
    // whole testcontainer is torn down at the end of the run anyway).
  });

  it("deletes an unused, unprotected role", async () => {
    const owner = await createTestUser({ role: "owner" });
    const caller = createCaller(contextFor(owner));
    const name = `test-role-${randomUUID()}`;
    await db.insert(roles).values({ name });

    await caller.delete({ name });

    const [row] = await db.select().from(roles).where(eq(roles.name, name));
    expect(row).toBeUndefined();
  });
});
