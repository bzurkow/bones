import { eq, sql } from "drizzle-orm";
import { AUTH_PROTOCOLS, DEFAULT_ENABLED_AUTH_PROTOCOLS } from "../auth-protocols.js";
import { db } from "../db/index.js";
import { authProtocols } from "../db/schema.js";

// Truncate-between-tests isolation: simple to reason about, fast enough
// for this table count. Revisit with per-test transactions if the suite
// grows large enough for that to matter. CASCADE handles the FK chain
// (sessions/accounts -> users) without needing to order the table list.
export async function resetDb() {
  await db.execute(sql`TRUNCATE TABLE "users", "sessions", "accounts", "verifications" CASCADE`);

  // auth_protocols isn't part of that FK chain and isn't truncated -- its
  // rows are seeded once per test-container lifetime by the migration
  // (see global-setup.ts), not per test. All test files share that one
  // container, so a setEnabled test in one file toggling a row would
  // otherwise leak into whatever file's test runs next in a different
  // worker. Reset it back to its seed defaults directly instead.
  await Promise.all(
    AUTH_PROTOCOLS.map((name) =>
      db.update(authProtocols).set({ enabled: DEFAULT_ENABLED_AUTH_PROTOCOLS.has(name) }).where(eq(authProtocols.name, name)),
    ),
  );
}
