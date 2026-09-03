import { describe, expect, it } from "vitest";
import { nextUserRole } from "./auth.js";

describe("nextUserRole", () => {
  it("makes the first-ever user the owner", () => {
    expect(nextUserRole(false)).toBe("owner");
  });

  it("makes every subsequent user standard", () => {
    expect(nextUserRole(true)).toBe("standard");
  });
});
