import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Runs once in the main process before any test file is loaded --
    // starts the shared Postgres container and applies migrations to it.
    // See src/test/global-setup.ts.
    globalSetup: "./src/test/global-setup.ts",
    // Generous defaults: container startup (globalSetup, once per run) and
    // the occasional real-DB round-trip in a test both comfortably exceed
    // vitest's 5s/10s defaults on a cold Docker pull.
    testTimeout: 20_000,
    hookTimeout: 30_000,
    // All test files share the one Postgres container globalSetup starts,
    // and reset-db.ts's beforeEach does a real TRUNCATE ... CASCADE against
    // it -- an assumption of exclusive access reset-db.ts's own comment
    // states outright ("simple to reason about"). Vitest's default runs
    // test *files* in parallel worker processes though, so without this
    // that assumption was silently false: one file's TRUNCATE mid-run could
    // wipe rows a concurrently-running file had just inserted, causing
    // exactly the kind of failure this looks like (a just-inserted row
    // missing moments later). Only surfaced as occasional real failures
    // once storage/index.ts's dev bootstrap (each test worker importing it
    // does its own bucket-create/CORS calls against real RustFS) shifted
    // file timing enough for the race to actually land instead of missing
    // by luck -- the race itself predates that change. Individual tests
    // within a file still run concurrently as normal; this only serializes
    // file-level execution.
    fileParallelism: false,
  },
});
