import { describe, expect, it } from "vitest";
import { toFetchHeaders } from "./fetch-headers.js";

describe("toFetchHeaders", () => {
  it("copies single string header values across", () => {
    const headers = toFetchHeaders({ "content-type": "application/json" });
    expect(headers.get("content-type")).toBe("application/json");
  });

  it("joins repeated headers with ', ' instead of dropping all but one", () => {
    // IncomingHttpHeaders types most known header names as plain `string`
    // (Node itself already joins repeats like `cookie`) -- an arbitrary
    // custom name is what's actually typed as `string | string[]`.
    const headers = toFetchHeaders({ "x-custom": ["a=1", "b=2"] });
    expect(headers.get("x-custom")).toBe("a=1, b=2");
  });

  it("skips headers with no value", () => {
    const headers = toFetchHeaders({ "x-missing": undefined, host: "example.com" });
    expect(headers.has("x-missing")).toBe(false);
    expect(headers.get("host")).toBe("example.com");
  });

  it("returns an empty Headers for an empty input", () => {
    const headers = toFetchHeaders({});
    expect([...headers.keys()]).toHaveLength(0);
  });
});
