import { describe, expect, it } from "vitest";
import { isStrongPassword, nextUserRole } from "./auth.js";

describe("nextUserRole", () => {
  it("makes the first-ever user the owner", () => {
    expect(nextUserRole(false)).toBe("owner");
  });

  it("makes every subsequent user standard", () => {
    expect(nextUserRole(true)).toBe("standard");
  });
});

describe("isStrongPassword", () => {
  it("rejects passwords under 8 characters", () => {
    expect(isStrongPassword("aB1!aB1")).toBe(false);
  });

  it("rejects passwords with no digit", () => {
    expect(isStrongPassword("aBcDefg!")).toBe(false);
  });

  it("rejects passwords with no special character", () => {
    expect(isStrongPassword("aBcDefg1")).toBe(false);
  });

  it("rejects passwords with no letter", () => {
    expect(isStrongPassword("12345678!")).toBe(false);
  });

  it("accepts a password with length, a letter, a digit, and a special character", () => {
    expect(isStrongPassword("aBcDefg1!")).toBe(true);
  });
});
