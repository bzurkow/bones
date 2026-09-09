import { beforeEach, describe, expect, it } from "vitest";
import { db } from "../../db/index.js";
import { termsAndConditions } from "../../db/schema.js";
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

describe("terms_and_conditions_active_uidx (DB-level, not just update's own transaction)", () => {
  it("rejects a second active row even bypassing the router's transaction entirely", async () => {
    const admin = await createTestUser({ role: "owner" });

    await db.insert(termsAndConditions).values({
      id: crypto.randomUUID(),
      assetUrl: "terms-and-conditions/a.md",
      active: true,
      addedBy: admin.id,
      termsAndConditionsAttribution: "A",
    });

    const insertSecondActive = db.insert(termsAndConditions).values({
      id: crypto.randomUUID(),
      assetUrl: "terms-and-conditions/b.md",
      active: true,
      addedBy: admin.id,
      termsAndConditionsAttribution: "B",
    });

    await expect(insertSecondActive).rejects.toThrow();
    // Confirm it's specifically the uniqueness constraint (Postgres
    // SQLSTATE 23505), not some other unrelated insert failure.
    await insertSecondActive.catch((err: { cause?: { code?: string } }) => {
      expect(err.cause?.code).toBe("23505");
    });
  });
});

describe("termsAndConditions.accept", () => {
  it("rejects an unauthenticated caller", async () => {
    const caller = createCaller(noSessionCtx);
    await expect(caller.accept({ termsAndConditionsId: "does-not-matter" })).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it("rejects an unknown termsAndConditionsId", async () => {
    const user = await createTestUser();
    const caller = createCaller(contextFor(user));
    await expect(caller.accept({ termsAndConditionsId: "does-not-exist" })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("records acceptance against the caller's own session, not a client-supplied user", async () => {
    const admin = await createTestUser({ role: "owner" });
    const terms = await createCaller(contextFor(admin)).update({ content: "v1", attribution: "Attribution 1" });

    const user = await createTestUser();
    const result = await createCaller(contextFor(user)).accept({ termsAndConditionsId: terms.id });

    expect(result.userId).toBe(user.id);
    expect(result.termsAndConditionsId).toBe(terms.id);
    expect(result.accepted).toBe(true);
    expect(result.acceptedDate).toBeInstanceOf(Date);
  });

  it("is idempotent -- accepting twice just refreshes acceptedDate, doesn't error", async () => {
    const admin = await createTestUser({ role: "owner" });
    const terms = await createCaller(contextFor(admin)).update({ content: "v1", attribution: "Attribution 1" });

    const user = await createTestUser();
    const caller = createCaller(contextFor(user));

    const first = await caller.accept({ termsAndConditionsId: terms.id });
    const second = await caller.accept({ termsAndConditionsId: terms.id });

    expect(first.accepted).toBe(true);
    expect(second.accepted).toBe(true);
  });

  it("flows through to hasAcceptedTermsAndConditions via getHasAcceptedTermsAndConditions", async () => {
    const admin = await createTestUser({ role: "owner" });
    const terms = await createCaller(contextFor(admin)).update({ content: "v1", attribution: "Attribution 1" });

    const user = await createTestUser();
    const { getHasAcceptedTermsAndConditions } = await import("../../terms-and-conditions.js");

    expect(await getHasAcceptedTermsAndConditions(user.id)).toBe(false);

    await createCaller(contextFor(user)).accept({ termsAndConditionsId: terms.id });

    expect(await getHasAcceptedTermsAndConditions(user.id)).toBe(true);
  });

  it("is null (not true or false) when there's no active version at all", async () => {
    const user = await createTestUser();
    const { getHasAcceptedTermsAndConditions } = await import("../../terms-and-conditions.js");

    expect(await getHasAcceptedTermsAndConditions(user.id)).toBeNull();
  });
});
