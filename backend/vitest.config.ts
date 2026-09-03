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
  },
});
