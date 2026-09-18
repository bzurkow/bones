import { randomUUID } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "../../db/index.js";
import { users } from "../../db/schema.js";
import { resetDb } from "../../test/reset-db.js";
import { classifyQuery } from "./db-change-logger.js";
import { dbChangeLog } from "./log-streams.js";

describe("classifyQuery", () => {
  it("returns null for a read -- this is a change log, not a query log", () => {
    expect(classifyQuery('select * from "users" where "id" = $1', ["1"])).toBeNull();
  });

  it("captures an insert's operation, table, sql, and params", () => {
    const entry = classifyQuery('insert into "users" ("id", "name") values ($1, $2)', ["1", "Ada"]);
    expect(entry).toEqual({
      event: "db.write",
      operation: "insert",
      table: "users",
      sql: 'insert into "users" ("id", "name") values ($1, $2)',
      params: ["1", "Ada"],
    });
  });

  it("captures an update and a delete the same way", () => {
    expect(classifyQuery('update "organizations" set "name" = $1 where "id" = $2', ["a", "b"])?.operation).toBe(
      "update",
    );
    expect(classifyQuery('delete from "organization_users" where "user_id" = $1', ["u"])?.operation).toBe("delete");
  });

  it("redacts sql and params for a sensitive table, instead of the field itself", () => {
    const entry = classifyQuery('insert into "accounts" ("id", "password") values ($1, $2)', ["1", "hunter2"]);
    expect(entry).toMatchObject({ table: "accounts", sql: "[redacted]", params: "[redacted]" });
  });

  it("still logs an unrecognized write shape, just without a table name", () => {
    const entry = classifyQuery("insert into unquoted_table default values", []);
    expect(entry).toMatchObject({ operation: "insert" });
  });
});

describe("dbChangeLogger wiring", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("fires for a real write made through the app's own db instance", async () => {
    const spy = vi.spyOn(dbChangeLog, "info").mockImplementation(() => undefined as never);

    await db.insert(users).values({ id: randomUUID(), name: "Test User", email: `${randomUUID()}@example.test` });

    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({ event: "db.write", operation: "insert", table: "users" }),
    );
    spy.mockRestore();
  });

  it("does not fire for a plain read", async () => {
    const spy = vi.spyOn(dbChangeLog, "info").mockImplementation(() => undefined as never);

    await db.select().from(users);

    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});
