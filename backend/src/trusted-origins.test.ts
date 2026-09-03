import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// trustedOrigins is computed once from process.env.TRUSTED_ORIGINS at
// module-load time, so each case here sets the env var, resets vitest's
// module cache, and re-imports fresh to see that case's value -- importing
// normally would only ever observe whatever was set the first time any
// test file (or global-setup.ts) touched this module.
async function loadTrustedOrigins() {
  vi.resetModules();
  const mod = await import("./trusted-origins.js");
  return mod.trustedOrigins;
}

describe("trustedOrigins", () => {
  const original = process.env.TRUSTED_ORIGINS;

  beforeEach(() => {
    delete process.env.TRUSTED_ORIGINS;
  });

  afterEach(() => {
    if (original === undefined) delete process.env.TRUSTED_ORIGINS;
    else process.env.TRUSTED_ORIGINS = original;
  });

  it("splits a comma-separated list", async () => {
    process.env.TRUSTED_ORIGINS = "http://a.test,http://b.test";
    expect(await loadTrustedOrigins()).toEqual(["http://a.test", "http://b.test"]);
  });

  it("trims whitespace around each origin", async () => {
    process.env.TRUSTED_ORIGINS = " http://a.test , http://b.test ";
    expect(await loadTrustedOrigins()).toEqual(["http://a.test", "http://b.test"]);
  });

  it("drops empty entries from trailing/doubled commas", async () => {
    process.env.TRUSTED_ORIGINS = "http://a.test,,";
    expect(await loadTrustedOrigins()).toEqual(["http://a.test"]);
  });

  it("is an empty array when unset", async () => {
    expect(await loadTrustedOrigins()).toEqual([]);
  });
});
