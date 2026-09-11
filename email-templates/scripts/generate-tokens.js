#!/usr/bin/env node
// Generates tokens.ts from shared-ui/src/tokens.css's light-mode `:root`
// block -- the one place every color/font/radius value used by this
// package comes from, so a theme change is a `tokens.css` edit and nothing
// else. Runs automatically before both `dev` and `build` (see
// package.json's scripts), so tokens.ts can never go stale as long as
// either of those has run -- there is deliberately no separate "check"
// step to keep up to date by hand.
//
// shared-ui's own components (Button, BrandLockup, ...) still can't be
// imported here -- they depend on Mantine and CSS Modules, neither of
// which runs in the plain Node process backend executes this package's
// compiled output in (see README's "Why not shared-ui" section). Reading
// tokens.css as plain text sidesteps that entirely: no bundler, no
// framework, just the literal hex/px/rgba values already sitting in a
// `.css` file.
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const tokensCssPath = path.join(here, "../../shared-ui/src/tokens.css");
const outPath = path.join(here, "../tokens.ts");

const css = readFileSync(tokensCssPath, "utf8").replace(/\/\*[\s\S]*?\*\//g, "");

// The *first* `:root { ... }` block only. tokens.css's second block,
// `:root[data-mantine-color-scheme="dark"] { ... }`, is dark mode -- this
// package deliberately has none (see the generated file's own header and
// README's "Always light mode"). `root\s*\{` requires only whitespace
// between "root" and "{", so the dark selector's
// `[data-mantine-color-scheme="dark"]` in between keeps it from matching
// here without needing to special-case it.
const rootBlock = css.match(/:root\s*\{([\s\S]*?)\n\}/);
if (!rootBlock) {
  throw new Error(`Couldn't find a ":root { ... }" block in ${tokensCssPath}`);
}

function kebabToCamel(name) {
  return name.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase());
}

const tokens = {};
for (const declaration of rootBlock[1].matchAll(/--bones-([a-z0-9-]+):\s*([^;]+);/g)) {
  tokens[kebabToCamel(declaration[1])] = declaration[2].trim();
}

// Deliberately NOT an allowlist of "the tokens this package currently
// uses" -- every `--bones-*` var in tokens.css's light `:root` ends up
// here, used or not, so a template reaching for a token tokens.css already
// has (say, --bones-danger for a future error state) never needs a second
// edit here first. (Non-`--bones-*` declarations, like the
// `--mantine-color-disabled` overrides also in that block, are skipped by
// the pattern itself.)
if (Object.keys(tokens).length === 0) {
  throw new Error(`Found a ":root" block in ${tokensCssPath} but no "--bones-*" declarations inside it`);
}

const body = Object.entries(tokens)
  .map(([key, value]) => `  ${key}: ${JSON.stringify(value)},`)
  .join("\n");

writeFileSync(
  outPath,
  `// GENERATED FILE -- do not edit by hand. Regenerate with
// \`yarn generate-tokens\` (run automatically before both \`yarn dev\` and
// \`yarn build\` in this package -- see scripts/generate-tokens.js and
// package.json). Source of truth is shared-ui/src/tokens.css's light-mode
// \`:root\` block; add or change a color there and rerun, never here.
//
// Light-mode values only, deliberately -- emails always render in light
// mode (see verification-email.tsx's colorScheme meta tags, which also
// actively opt out of client-side dark-mode auto-inversion), so there is
// no dark-mode half of this file, unlike tokens.css's own \`:root\` +
// \`:root[data-mantine-color-scheme="dark"]\` split.
//
// Web fonts (Instrument Sans/JetBrains Mono) aren't reliably loadable in
// email clients -- most strip @font-face/external font <link>s entirely
// (Outlook and Gmail notably), so in practice every client falls back to
// fontSans/fontMono's system-font tail regardless. Listed first anyway
// (some clients -- Apple Mail, some webmail -- do honor it), in the same
// fallback order tokens.css uses.
export const emailTokens = {
${body}
} as const;
`,
);

console.log(`email-templates/tokens.ts regenerated from shared-ui/src/tokens.css`);
