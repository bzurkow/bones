import { beforeEach, describe, expect, it } from "vitest";
import { getEnabledFeatures, hasPermission } from "./permissions.js";
import { resetDb } from "./test/reset-db.js";

beforeEach(async () => {
  await resetDb();
});

// Read-only against the real seeded roles/features/feature_roles -- safe
// (nothing in this suite mutates those rows; any test that needs to
// mutate creates its own uniquely-named fixture instead, see
// trpc/routers/features.test.ts etc.) and doubles as a real regression
// check on the seed migration's own data, not just the lookup logic.
describe("hasPermission", () => {
  it("reflects the seeded defaults for a granted, enabled feature", async () => {
    expect(await hasPermission("administrator", "admin.users.view")).toBe(true);
  });

  it("reflects a role explicitly not granted a feature per the seed", async () => {
    expect(await hasPermission("administrator", "admin.users.update-owner")).toBe(false);
  });

  it("fails closed for a role with no feature_roles row at all", async () => {
    expect(await hasPermission("standard", "admin.users.view")).toBe(false);
  });

  it("fails closed for an unknown feature key", async () => {
    expect(await hasPermission("owner", "not.a.real.feature")).toBe(false);
  });
});

describe("getEnabledFeatures", () => {
  it("returns every feature/route/page-view key a role has access to", async () => {
    const result = await getEnabledFeatures("owner");
    // One key from each of the three tables the union pulls from --
    // "admin" (routes), "admin.users" (page_views), "admin.roles.delete"
    // (features).
    expect(result).toEqual(expect.arrayContaining(["admin", "admin.users", "admin.roles.delete"]));
  });

  it("returns an empty list for a role with no grants at all", async () => {
    expect(await getEnabledFeatures("standard")).toEqual([]);
  });
});
