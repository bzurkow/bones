import { describe, expect, it } from "vitest";
import { isArchivable } from "./log-archiver.js";

describe("isArchivable", () => {
  it("is false for a file dated today -- still actively being written", () => {
    expect(isArchivable("requests.2026-09-18.0.log", "2026-09-18")).toBe(false);
  });

  it("is true for a file dated any day before today", () => {
    expect(isArchivable("requests.2026-09-17.0.log", "2026-09-18")).toBe(true);
    expect(isArchivable("db-changes.2025-01-01.3.log", "2026-09-18")).toBe(true);
  });

  it("is false for a filename with no date in it", () => {
    expect(isArchivable("requests.log", "2026-09-18")).toBe(false);
    expect(isArchivable(".gitkeep", "2026-09-18")).toBe(false);
  });
});
