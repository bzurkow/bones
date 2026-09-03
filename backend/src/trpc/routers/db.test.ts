import { describe, expect, it } from "vitest";
import { createCallerFactory, type Context } from "../trpc.js";
import { dbRouter } from "./db.js";

const createCaller = createCallerFactory(dbRouter);
const noSessionCtx: Context = { session: null };

describe("db.ping", () => {
  it("round-trips a real query against the test database", async () => {
    const caller = createCaller(noSessionCtx);
    const result = await caller.ping();
    expect(result).toEqual({ status: "ok", row: { ok: 1 } });
  });
});
