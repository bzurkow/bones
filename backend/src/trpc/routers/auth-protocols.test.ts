import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { db } from "../../db/index.js";
import { authProtocols } from "../../db/schema.js";
import { resetDb } from "../../test/reset-db.js";
import { contextFor, createTestUser } from "../../test/context.js";
import { createCallerFactory, type Context } from "../trpc.js";
import { authProtocolsRouter } from "./auth-protocols.js";

const createCaller = createCallerFactory(authProtocolsRouter);
const noSessionCtx: Context = { session: null };

beforeEach(async () => {
  await resetDb();
});

describe("authProtocols.list", () => {
  it("is readable with no session at all -- Login/SignUp need this pre-auth", async () => {
    const caller = createCaller(noSessionCtx);

    const result = await caller.list();

    expect(result).toEqual(
      expect.arrayContaining([
        { name: "email", enabled: true },
        { name: "google", enabled: false },
      ]),
    );
  });
});

describe("authProtocols.setEnabled", () => {
  it("rejects an unauthenticated caller", async () => {
    const caller = createCaller(noSessionCtx);
    await expect(caller.setEnabled({ name: "google", enabled: true })).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it("rejects a signed-in non-admin caller", async () => {
    const standardUser = await createTestUser({ role: "standard" });
    const caller = createCaller(contextFor(standardUser));
    await expect(caller.setEnabled({ name: "google", enabled: true })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("turns a protocol on", async () => {
    const admin = await createTestUser({ role: "owner" });
    const caller = createCaller(contextFor(admin));

    const result = await caller.setEnabled({ name: "google", enabled: true });

    expect(result).toEqual({ name: "google", enabled: true });
    const [row] = await db.select().from(authProtocols).where(eq(authProtocols.name, "google"));
    expect(row?.enabled).toBe(true);
  });

  it("turns a protocol off when another stays enabled", async () => {
    const admin = await createTestUser({ role: "owner" });
    const caller = createCaller(contextFor(admin));
    await caller.setEnabled({ name: "google", enabled: true });

    const result = await caller.setEnabled({ name: "email", enabled: false });

    expect(result).toEqual({ name: "email", enabled: false });
  });

  it("refuses to disable the last remaining enabled protocol", async () => {
    const admin = await createTestUser({ role: "owner" });
    const caller = createCaller(contextFor(admin));

    await expect(caller.setEnabled({ name: "email", enabled: false })).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
    const [row] = await db.select().from(authProtocols).where(eq(authProtocols.name, "email"));
    expect(row?.enabled).toBe(true);
  });
});
