import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

// Vitest global setup: runs once in the main process before any test file
// (and therefore before anything a test file imports, like auth.ts or
// db/index.ts) loads -- so process.env is fully in place by the time those
// modules read it at import time. The teardown function returned below
// runs once after the whole suite finishes.
export default async function setup() {
  // Same image docker-compose.yml uses for dev, so tests run against the
  // same Postgres version production does.
  const container = await new PostgreSqlContainer("postgres:18-alpine").start();
  process.env.DATABASE_URL = container.getConnectionUri();

  // auth.ts reads these at import time too (Google OAuth config, secrets)
  // -- never exercised by any test (no test drives a real OAuth flow), but
  // betterAuth({...}) still evaluates them while building its config.
  process.env.BETTER_AUTH_URL ??= "http://localhost:3000";
  process.env.BETTER_AUTH_SECRET ??= "test-secret-test-secret-test-secret";
  process.env.GOOGLE_CLIENT_ID ??= "test-client-id";
  process.env.GOOGLE_CLIENT_SECRET ??= "test-client-secret";
  process.env.TRUSTED_ORIGINS ??= "http://localhost:5173";

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  await migrate(drizzle(pool), { migrationsFolder: "./drizzle" });
  await pool.end();

  return async () => {
    await container.stop();
  };
}
