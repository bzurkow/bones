import { beforeEach, describe, expect, it } from "vitest";
import { resetDb } from "../../test/reset-db.js";
import { contextFor, createTestUser } from "../../test/context.js";
import { createCallerFactory, type Context } from "../trpc.js";
import { userSettingsRouter } from "./user-settings.js";

const createCaller = createCallerFactory(userSettingsRouter);
const noSessionCtx: Context = { session: null };

beforeEach(async () => {
  await resetDb();
});

describe("userSettings.updateUserSettings", () => {
  it("rejects an unauthenticated caller", async () => {
    const caller = createCaller(noSessionCtx);
    await expect(caller.updateUserSettings({ viewMode: "dark" })).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it("rejects an empty input", async () => {
    const user = await createTestUser();
    const caller = createCaller(contextFor(user));
    await expect(caller.updateUserSettings({})).rejects.toThrow(
      "Provide at least one field to update.",
    );
  });

  it("rejects an invalid viewMode", async () => {
    const user = await createTestUser();
    const caller = createCaller(contextFor(user));
    // @ts-expect-error -- deliberately invalid input, exercising the zod enum
    await expect(caller.updateUserSettings({ viewMode: "sepia" })).rejects.toThrow();
  });

  it("updates only the caller's own row", async () => {
    const caller1 = await createTestUser();
    const caller2 = await createTestUser();

    const result = await createCaller(contextFor(caller1)).updateUserSettings({
      viewMode: "dark",
      inheritViewModeFromBrowser: false,
    });

    expect(result).toEqual({ viewMode: "dark", inheritViewModeFromBrowser: false });

    // The other user's row is untouched.
    const other = await createCaller(contextFor(caller2)).updateUserSettings({
      // no-op-ish update just to read caller2's current state back
      inheritViewModeFromBrowser: caller2.inheritViewModeFromBrowser,
    });
    expect(other.viewMode).toBe(caller2.viewMode);
  });
});
