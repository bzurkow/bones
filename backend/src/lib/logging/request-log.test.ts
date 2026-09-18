import { describe, expect, it } from "vitest";
import { buildTrpcLogEntry } from "./request-log.js";

describe("buildTrpcLogEntry", () => {
  it("shapes a successful call", () => {
    const entry = buildTrpcLogEntry({
      path: "organizations.addMember",
      type: "mutation",
      durationMs: 5,
      ok: true,
      errorCode: undefined,
      requestId: "r1",
      userId: "u1",
      userEmail: "a@example.com",
      rawInput: { organizationId: "o1", userId: "u2" },
    });

    expect(entry).toEqual({
      event: "trpc.call",
      path: "organizations.addMember",
      type: "mutation",
      durationMs: 5,
      ok: true,
      errorCode: undefined,
      requestId: "r1",
      userId: "u1",
      userEmail: "a@example.com",
      input: { organizationId: "o1", userId: "u2" },
    });
  });

  it("carries a failed call's error code through", () => {
    const entry = buildTrpcLogEntry({
      path: "organizations.list",
      type: "query",
      durationMs: 1,
      ok: false,
      errorCode: "FORBIDDEN",
      requestId: undefined,
      userId: "u1",
      userEmail: "a@example.com",
      rawInput: undefined,
    });

    expect(entry.ok).toBe(false);
    expect(entry.errorCode).toBe("FORBIDDEN");
  });

  it("redacts sensitive fields inside the raw input", () => {
    const entry = buildTrpcLogEntry({
      path: "profile.changePassword",
      type: "mutation",
      durationMs: 0,
      ok: false,
      errorCode: "BAD_REQUEST",
      requestId: undefined,
      userId: undefined,
      userEmail: undefined,
      rawInput: { currentPassword: "a", newPassword: "b" },
    });

    expect(entry.input).toEqual({ currentPassword: "[redacted]", newPassword: "[redacted]" });
  });
});
