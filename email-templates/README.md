# email-templates

Transactional email templates, as a standalone top-level workspace --
separate from `backend` because authoring an email is a genuinely different
job (table layout, inlined styles, no dark mode, no live app tokens) from
authoring an app screen. `backend` depends on this package's *built* output
to send real emails; it never touches the `.tsx` source.

## Editing a template

1. `yarn email-templates:dev` (from the repo root) -- starts a live preview
   server at **http://localhost:3010**. Edit any file in `emails/` and the
   preview updates as you save. This is the actual day-to-day editing loop.
2. To see the change go out for real: restart the backend dev container
   (`yarn backend:dev`, or `docker compose -f docker-compose.dev.yml restart
   backend`). Its `dev` container image rebuilds `email-templates` on every
   boot (see `backend/Dockerfile`'s `dev` stage) before starting, so a
   restart is all it takes -- `dist/` is gitignored like every other
   workspace's build output, never committed, and nothing watches this
   package's source for hot-reload the way `tsx watch` does for backend's
   own files.
3. `yarn email-templates:build` also exists directly (used by the Docker
   step above, and by CI/the production image's build stage) if you want to
   compile and sanity-check `dist/` by hand without going through Docker at
   all -- e.g. to inspect the actual rendered HTML string.

## Adding a new template

- `emails/<name>.tsx` -- the template itself: plain HTML tags (`<table>`,
  `<tr>`, `<td>`, not `<div>`-based flex/grid -- email clients, Outlook
  especially, need table layout), every style as an inline `style` object
  built from `tokens.ts`'s values. Export a `PreviewProps` static so the dev
  server (and anyone opening the file cold) has something real to render.
  See `verification-email.tsx` for the shape.
- `index.tsx` -- add a `render<Name>Email(...)` function that calls
  `render()` on your new component. One function per template, real typed
  props -- not a generic `render(name, props)` -- so a wrong prop is a
  compile error, not a silent runtime bug.
- `backend/src/email/templates.ts` -- re-export the new function so
  `auth.ts` (or wherever needs it) imports it from backend's own `email/`
  module rather than reaching into this package directly.

## Why not shared-ui, and why not @react-email/components

- **shared-ui's actual components** (`Button`, `BrandLockup`, ...) can't be
  imported here -- they depend on Mantine and CSS Modules, neither of which
  runs in the plain Node process backend executes this package's compiled
  output in (no bundler in the loop). Its *tokens* are a different story,
  though: `tokens.css` is plain CSS text with no framework dependency, so
  `tokens.ts` is a **generated file** (`scripts/generate-tokens.js`,
  run automatically before both `dev` and `build` -- see its own header
  comment) that parses the light-mode subset of `shared-ui/src/tokens.css`'s
  values straight out of the source `:root` block. There is exactly one
  place to change a color, font, or radius across the whole app: edit
  `tokens.css`; email-templates picks it up the next time it runs `dev` or
  `build`, nothing to hand-sync. (This is *not* the same class of
  cross-runtime-boundary duplication `backend/src/auth.ts` still has with
  `web-app/src/AuthHelpers/password-rules.ts` -- that pair has no shared
  plain-text source to generate from, just two independent
  implementations.)
- **`@react-email/components`** (and every individual `@react-email/*`
  component package) is deprecated npm-wide in favor of importing
  components from the unified `react-email` package -- but that pulls
  dev-only dependencies (PrismJS, marked, Tailwind) into anything that
  imports from it, ~80MB per bundle. Templates here are plain HTML/JSX
  instead; `@react-email/render`'s `render()` works on any React tree, not
  just their own components, so this loses nothing real.

## Always light mode

No `@media (prefers-color-scheme: dark)` block, ever -- every color is a
literal light value from `tokens.ts`. `verification-email.tsx`'s `<head>`
also sets `color-scheme`/`supported-color-schemes` to `light`, which is the
actual opt-out some clients (Apple Mail, Outlook.com) need to stop
auto-inverting colors under a system dark-mode preference -- a static light
color alone isn't enough on its own.
