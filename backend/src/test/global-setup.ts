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
  // Same image docker-compose.dev.yml uses for dev, so tests run against
  // the same Postgres version production does.
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

  // storage/index.ts reads these at import time too. Unlike Postgres above,
  // this doesn't spin up its own ephemeral container -- RustFS has no
  // first-class Testcontainers module the way @testcontainers/postgresql
  // does, so tests that actually exercise the S3 path (e.g.
  // terms-and-conditions.test.ts's `update`) rely on the dev RustFS from
  // docker-compose.dev.yml already running on its usual host port. A real
  // GenericContainer-based ephemeral RustFS would match Postgres's
  // isolation more closely; deferred as a separate piece of work.
  process.env.AWS_REGION ??= "us-east-1";
  process.env.AWS_ACCESS_KEY_ID ??= "rustfsadmin";
  process.env.AWS_SECRET_ACCESS_KEY ??= "rustfsadmin";
  process.env.S3_BUCKET ??= "bones-dev";
  process.env.S3_ENDPOINT ??= "http://localhost:9000";
  process.env.S3_FORCE_PATH_STYLE ??= "true";

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  await migrate(drizzle(pool), { migrationsFolder: "./drizzle" });
  await pool.end();

  return async () => {
    await container.stop();
  };
}
