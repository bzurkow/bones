import { beforeEach, describe, expect, it } from "vitest";
import { resetDb } from "../../test/reset-db.js";
import { contextFor, createTestUser } from "../../test/context.js";
import { createCallerFactory, type Context } from "../trpc.js";
import { termsAndConditionsRouter } from "./terms-and-conditions.js";

const createCaller = createCallerFactory(termsAndConditionsRouter);
const noSessionCtx: Context = { session: null };

beforeEach(async () => {
  await resetDb();
});

describe("termsAndConditions.get", () => {
  it("returns null when nothing is active", async () => {
    const caller = createCaller(noSessionCtx);
    await expect(caller.get()).resolves.toBeNull();
  });

  it("returns the active version with a real, working presigned URL", async () => {
    const admin = await createTestUser({ role: "owner" });
    const adminCaller = createCaller(contextFor(admin));
    await adminCaller.update({ content: "# Terms\n\nBe kind.", attribution: "Test attribution" });

    const result = await createCaller(noSessionCtx).get();
    expect(result?.active).toBe(true);
    expect(result?.termsAndConditionsAttribution).toBe("Test attribution");

    // Not just "a URL was returned" -- confirms it's actually fetchable
    // against the real RustFS instance and round-trips the uploaded content.
    const res = await fetch(result!.assetUrl);
    expect(res.status).toBe(200);
    await expect(res.text()).resolves.toBe("# Terms\n\nBe kind.");
  });
});

describe("termsAndConditions.update", () => {
  it("rejects an unauthenticated caller", async () => {
    const caller = createCaller(noSessionCtx);
    await expect(caller.update({ content: "x", attribution: "y" })).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it("rejects a signed-in non-admin caller", async () => {
    const standardUser = await createTestUser({ role: "standard" });
    const caller = createCaller(contextFor(standardUser));
    await expect(caller.update({ content: "x", attribution: "y" })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("deactivates the previous version when a new one is added", async () => {
    const admin = await createTestUser({ role: "administrator" });
    const caller = createCaller(contextFor(admin));

    const first = await caller.update({ content: "v1", attribution: "Attribution 1" });
    const second = await caller.update({ content: "v2", attribution: "Attribution 2" });

    expect(first.active).toBe(true);
    expect(second.active).toBe(true);
    expect(second.id).not.toBe(first.id);

    const current = await createCaller(noSessionCtx).get();
    expect(current?.id).toBe(second.id);
    expect(current?.termsAndConditionsAttribution).toBe("Attribution 2");
  });
});
