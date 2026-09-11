import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { isAuthProtocolEnabled } from "./auth-protocols.js";
import { db } from "./db/index.js";
import { authProtocols } from "./db/schema.js";
import { resetDb } from "./test/reset-db.js";

beforeEach(async () => {
  await resetDb();
});

describe("isAuthProtocolEnabled", () => {
  it("reflects the seeded defaults -- only email starts enabled", async () => {
    expect(await isAuthProtocolEnabled("email")).toBe(true);
    expect(await isAuthProtocolEnabled("google")).toBe(false);
  });

  it("reflects a row that's since been toggled", async () => {
    await db.update(authProtocols).set({ enabled: true }).where(eq(authProtocols.name, "google"));
    expect(await isAuthProtocolEnabled("google")).toBe(true);
  });

  it("fails open (treats a missing row as enabled) rather than locking every sign-in out", async () => {
    await db.delete(authProtocols).where(eq(authProtocols.name, "email"));
    expect(await isAuthProtocolEnabled("email")).toBe(true);
  });
});
