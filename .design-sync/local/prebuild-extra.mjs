#!/usr/bin/env node
// Pre-compiles the app-internal (CSS-module) components that extraEntries
// pulls into the DS bundle. package-build.mjs's shared esbuild pass
// deliberately does NOT use the 'local-css' loader for .css files (see
// lib/bundle.mjs) so pre-baked css-module hashes from already-compiled DSes
// survive untouched. web-app/web-static's own components are NOT
// pre-compiled anywhere else in this repo (no build step ships them) --
// they use raw *.module.css that needs real CSS-module class-name
// resolution to render correctly. This script runs that resolution once,
// with esbuild's own 'local-css' loader (the real CSS-modules compiler,
// not a reimplementation), and writes a plain .js + plain .css pair that
// package-build.mjs's default 'css' loader can bundle unmodified.
//
// Everything real (react, react-dom, shared-ui, @mantine/*, @tabler/*)
// stays external here and gets resolved for real in package-build.mjs's
// own esbuild pass, which bundles this output together with shared-ui's
// own entry into one IIFE -- so those deps are resolved exactly once.
import { build } from "esbuild";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = fileURLToPath(new URL("../../", import.meta.url));
const OUT_DIR = join(REPO_ROOT, ".design-sync/.cache/extra-prebuilt");

// name -> entry file (index.ts, package-relative to REPO_ROOT)
const TARGETS = {
  PageHeader: "web-app/src/components/PageHeader/index.ts",
  ErrorMessage: "web-app/src/components/ErrorMessage/index.ts",
  RowCard: "web-app/src/components/RowCard/index.ts",
  Table: "web-app/src/components/Table/index.ts",
  TextField: "web-app/src/components/TextField/index.ts",
  ColorSchemeToggle: "web-static/app/ColorSchemeToggle.tsx",
};

const EXTERNAL = ["react", "react-dom", "shared-ui", "@mantine/*", "@tabler/*"];

mkdirSync(OUT_DIR, { recursive: true });

for (const [name, rel] of Object.entries(TARGETS)) {
  const entry = join(REPO_ROOT, rel);
  const outdir = join(OUT_DIR, name);
  mkdirSync(outdir, { recursive: true });
  const result = await build({
    entryPoints: [entry],
    bundle: true,
    format: "esm",
    platform: "browser",
    target: "es2020",
    outdir,
    entryNames: name,
    loader: { ".module.css": "local-css" },
    external: EXTERNAL,
    write: true,
    logLevel: "warning",
  });
  if (result.warnings.length) {
    console.error(`  [prebuild-extra] ${name}: ${result.warnings.length} warning(s)`);
  }
  const jsPath = join(outdir, `${name}.js`);
  const cssPath = join(outdir, `${name}.css`);
  // esbuild writes JS and CSS as sibling files but doesn't link them --
  // splice in a plain side-effect import so the CSS travels with the JS
  // through package-build.mjs's own bundle pass.
  try {
    readFileSync(cssPath);
    const js = readFileSync(jsPath, "utf8");
    writeFileSync(jsPath, `import "./${name}.css";\n${js}`);
    console.error(`  [prebuild-extra] ${name}: ok (js+css)`);
  } catch {
    console.error(`  [prebuild-extra] ${name}: ok (js only, no css emitted)`);
  }
}
console.error(`[prebuild-extra] done -> ${OUT_DIR}`);
