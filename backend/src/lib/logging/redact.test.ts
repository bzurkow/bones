import { describe, expect, it } from "vitest";
import { redactObject } from "./redact.js";

describe("redactObject", () => {
  it("redacts a top-level password/token/secret field", () => {
    expect(redactObject({ password: "hunter2", name: "Ada" })).toEqual({
      password: "[redacted]",
      name: "Ada",
    });
  });

  it("redacts nested fields, at any depth", () => {
    expect(redactObject({ user: { credentials: { accessToken: "abc" }, id: "1" } })).toEqual({
      user: { credentials: { accessToken: "[redacted]" }, id: "1" },
    });
  });

  it("redacts matching keys inside arrays", () => {
    expect(redactObject([{ secret: "x" }, { name: "ok" }])).toEqual([{ secret: "[redacted]" }, { name: "ok" }]);
  });

  it("leaves non-matching keys and primitives untouched", () => {
    expect(redactObject({ count: 3, ok: true })).toEqual({ count: 3, ok: true });
    expect(redactObject("plain")).toBe("plain");
    expect(redactObject(undefined)).toBeUndefined();
    expect(redactObject(null)).toBeNull();
  });

  it("matches case-insensitively and on partial key names", () => {
    expect(redactObject({ newPassword: "x", REFRESH_TOKEN: "y", clientSecretKey: "z" })).toEqual({
      newPassword: "[redacted]",
      REFRESH_TOKEN: "[redacted]",
      clientSecretKey: "[redacted]",
    });
  });

  it("does not descend into non-plain objects (e.g. Date)", () => {
    const date = new Date("2026-01-01");
    expect(redactObject({ createdAt: date })).toEqual({ createdAt: date });
  });
});
