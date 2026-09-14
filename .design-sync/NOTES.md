# design-sync notes

Repo-specific gotchas and state for `/design-sync`. Read this (and
`config.json`) before resuming.

## Status as of this commit (paused mid-run, first-time import)

- Target project: **Bones Design System** (`claude.ai/design`), projectId
  pinned in `config.json`. Created fresh, still **empty** — nothing has been
  uploaded yet, so the next run's router will still take the incremental
  upload path.
- Scope: `shared-ui` + selected app-internal components from `web-app` and
  `web-static` (the user asked for all three explicitly — shared-ui alone
  only ships what the marketing site needs, per its own `index.ts` comment).
- Build is clean: `node .ds-sync/package-build.mjs --config
  .design-sync/config.json --node-modules ./node_modules --out ./ds-bundle`
  followed by `node .ds-sync/package-validate.mjs ./ds-bundle` (add
  `--no-render-check` — see below) both exit 0. 17 components total.
- Preview authoring: **4 of 17 done** (`Eyebrow`, `RowCard`, `Row`,
  `MarkdownViewer` — the solo calibration set). 13 remain: `BonesMark`,
  `BrandLockup`, `Button`, `CardGrid`, `CodePanel`,
  `ColorSchemeToggleButton`, `ConfusedIcon`, `MarkdownEditor`, `PageHeader`,
  `ErrorMessage`, `Table`, `TextField`, `ColorSchemeToggle`. User chose
  "author everything" (not floor cards) for preview scope.
- **Blocked on**: Playwright + Chromium are not installed anywhere in this
  repo or machine cache (checked `~/.cache/ms-playwright/` — empty). Both
  the render check (`package-validate.mjs`) and preview grading
  (`package-capture.mjs`, which screenshots each authored cell) need it.
  User declined the ~200MB install twice (once for the render check, once
  again when told grading needs it too) and asked to pause here rather than
  choose the "I'll eyeball it manually" path. **Next session: ask again
  whether to install, or proceed on manual/eyeball verification instead —
  don't re-litigate the design decisions below, just pick up the install
  question.**
- The upload plan is **not** open in any durable way — `finalize_plan`'s
  `planId` lived only in the prior session and is gone. Re-open it fresh
  next time per the skill's incremental-path steps (one approval).

## Build inputs that need re-running after any source change

1. `node .design-sync/local/prebuild-extra.mjs` — pre-compiles the 6
   CSS-module components pulled in from `web-app`/`web-static` (see below).
   Always run this before `package-build.mjs`; `cfg.buildCmd` records it.
2. `node .ds-sync/package-build.mjs --config .design-sync/config.json
   --node-modules ./node_modules --out ./ds-bundle` (uses `cfg.entry`, no
   `--entry` flag needed — see below).
3. `node .ds-sync/package-validate.mjs ./ds-bundle [--no-render-check]`.

## Why the config looks the way it does

- **`--node-modules` must be the repo root's**, not `shared-ui/node_modules`
  (doesn't exist — yarn classic workspaces hoist everything, including
  `react`/`@types/react`/`@mantine/core`/`@tabler/icons-react`, to the root).
- **`cfg.entry: "./shared-ui/src/index.ts"` is set deliberately.** Without
  an explicit `--entry`/`cfg.entry`, `PKG_DIR` resolves to
  `node_modules/shared-ui` (a symlink), and every `../`-relative cfg path
  (`extraEntries`, `extraFonts`, `componentSrcMap`) is resolved *lexically*
  against that symlinked location — one `../` lands in `node_modules/`, not
  the repo root, and paths silently fail with `not found — skipped` (no
  hard error). Passing `cfg.entry` makes `PKG_DIR` resolve to the *real*
  `shared-ui/` directory instead, so plain `../web-app/...`-style paths
  behave as expected. (`componentSrcMap`'s `../web-app/...` paths
  incidentally also "worked" under the symlinked `PKG_DIR`, only because
  `web-app` is *itself* a hoisted workspace symlink at the same
  `node_modules/` level — that's a coincidence, not something to rely on.
  `extraEntries`/`extraFonts` pointing at `.design-sync/` have no such
  workspace-symlink escape hatch, which is what surfaced the bug.)
- **`cfg.provider` is `MantineProvider` with `theme` via `$ref`.** shared-ui
  components are Mantine-themed (see `theme.ts`, used by `web-app/App.tsx`
  and `web-static/app/providers.tsx`), so every preview needs the same
  `<MantineProvider theme={theme}>` wrap the real apps use. `theme` doesn't
  need its own `extraEntries` module — it's already a top-level shared-ui
  export.
- **`MantineProvider` is exposed via a narrow adapter
  (`.design-sync/local/mantine-provider-entry.mjs`), not by adding
  `"@mantine/core"` to `extraEntries` directly.** Tried the direct route
  first: it silently **dropped Bones' own `Table` export** from the final
  bundle (esbuild followed real ES module semantics — an ambiguous `export
  *` name shared by two sources that neither is the "main" package is
  omitted, with no warning). Confirmed by direct probe before settling on
  the narrow adapter. **If any future `extraEntries` addition needs
  something from `@mantine/core` (or any other whole external package),
  write a similar narrow re-export file rather than adding the bare
  package name** — the collision risk (an external package sharing a name
  with a real Bones/web-app component) is real and silent.
- **`cfg.cssEntry: "src/tokens.css"`** — without it, `--bones-*` CSS custom
  properties were entirely undefined in the shipped stylesheet
  (`[TOKENS_MISSING]`, 22 vars). shared-ui's own JS entry never imports
  `tokens.css` (apps import it separately, `shared-ui/tokens.css`), and
  there's no `tokensPkg`/`tokensGlob` mechanism that would have found it
  on its own.
- **`cfg.extraFonts`** points at a **self-authored, self-hosted** font
  stylesheet (`.design-sync/local/fonts/fonts.css` + 4 `.woff2` files,
  latin + latin-ext subsets of Instrument Sans 400–600 and JetBrains Mono
  400–500). Neither app ships these as static assets — both fetch
  Instrument Sans/JetBrains Mono from `fonts.googleapis.com` via a
  `<link>` tag at runtime (`web-app/index.html`,
  `web-static/app/layout.tsx`), which design-sync's package-shape font
  scraper has no mechanism to pick up (that's a storybook-shape-only
  feature, `scrapeRemoteImports`). Fetched the real files directly from
  Google Fonts (SIL Open Font License) rather than inventing a fallback —
  per the skill's own guidance ("resolve it, don't rationalize it away").
- **The 6 `extraEntries` pointing into `.design-sync/.cache/extra-prebuilt/`
  are generated, not committed** — `prebuild-extra.mjs` (durable,
  committed) regenerates them every run. They exist because
  `package-build.mjs`'s shared esbuild pass deliberately does NOT use the
  `local-css` loader for `.css`/`.module.css` (see its own comment: some
  DSes ship pre-hashed CSS-module output as plain `.css` and local-css
  would double-hash it). `web-app`'s own components
  (`PageHeader`/`ErrorMessage`/`RowCard`/`Table`/`TextField`) and
  `web-static`'s `ColorSchemeToggle` use *raw, uncompiled* `*.module.css`
  imports (no build step ships them anywhere else in this repo), so they
  need real CSS-Modules class-name resolution before they can be bundled
  as plain JS+CSS. `prebuild-extra.mjs` runs esbuild's own `local-css`
  loader once per component (the real CSS-modules compiler, not a
  reimplementation) with everything else (`react`, `shared-ui`,
  `@mantine/*`, `@tabler/*`) left external, so those dependencies still
  resolve exactly once, for real, in `package-build.mjs`'s own pass.
- **`componentSrcMap`/`dtsPropsFor` cover the 7 non-shared-ui components**
  (`PageHeader`, `ErrorMessage`, `RowCard`, `Row`, `Table`, `TextField`,
  `ColorSchemeToggle`) since none of them are part of shared-ui's own
  `.d.ts`/type-checker project — auto prop-extraction can't see them.
  `dtsPropsFor.Table` intentionally drops the real `TableProps<T>` generic
  to a concrete `any`-typed shape (`dtsPropsFor` bodies can't carry
  generics/extends clauses).

## Known/accepted quirks (not bugs)

- **`Row` groups under `rowcard`, not `web-app`** like its 5 siblings. Both
  `RowCard` and `Row` resolve to the same source file
  (`RowCard.tsx`); the group-derivation heuristic filters out a path
  segment matching the component's own name case-insensitively — that
  filter catches `RowCard` (whose own dir segment IS "RowCard") but not
  `Row` (whose matching dir segment is "RowCard", not "Row" — not an exact
  match), so `Row` falls back one level further to the containing
  directory name. Harmless (still a legible group name), not worth an
  override.
- Group assignment overall is fairly flat: all 10 native shared-ui
  components land in `general` (no existing `@category` JSDoc convention
  to draw from, and root `CLAUDE.md` references a `COMPONENTS.md` that
  doesn't actually exist in this repo — likely stale). Could be improved
  later by adding `@category` JSDoc to shared-ui's own components, but
  that edits real product source purely for design-sync's benefit — left
  alone unless the user asks.

## Re-sync risks (read before the next run)

- The Playwright install decision above is the actual blocker — resolve it
  first.
- `.design-sync/.cache/extra-prebuilt/` and the rest of `.cache/` are
  gitignored and regenerate from scratch every run — if `prebuild-extra.mjs`
  or `package-build.mjs` is skipped after a fresh clone, `extraEntries`
  paths will fail with `not found — skipped` and those 7 components will
  silently drop out of the bundle (build still exits 0 — watch the log for
  the `extraEntries: ... not found` lines, which should be ABSENT on a
  healthy build).
- The 4 downloaded `.woff2` files in `.design-sync/local/fonts/` are
  committed binaries (real font files, not generated) — don't regenerate
  them without reason; they won't change unless the repo's font choice
  changes.
- No `docsDir` is configured (`docs: 0/17 components matched` in the build
  log) — every `.prompt.md` is synthesized from `.d.ts` + authored preview
  content. That's expected; this repo has no per-component doc files.
