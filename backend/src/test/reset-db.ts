import { sql } from "drizzle-orm";
import { db } from "../db/index.js";

// Truncate-between-tests isolation: simple to reason about, fast enough
// for this table count. Revisit with per-test transactions if the suite
// grows large enough for that to matter. CASCADE handles the FK chain
// (sessions/accounts -> users) without needing to order the table list.
export async function resetDb() {
  await db.execute(sql`TRUNCATE TABLE "users", "sessions", "accounts", "verifications" CASCADE`);
}
