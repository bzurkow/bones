import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// drizzle-kit's own dotenv auto-load only looks in its CWD (this package's
// own directory, since `yarn db:generate` etc. run with backend/ as CWD
// even when invoked via `yarn workspace backend ...` from elsewhere) -- env
// vars live at the repo root now, so this points there explicitly instead.
config({ path: "../.env" });

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
