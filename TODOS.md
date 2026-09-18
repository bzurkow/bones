# Bones — TODOs

Living backlog of work that hasn't been built yet. Most items are deliberately
deferred, not forgotten — don't start on one without checking with the user
first, especially where a note says "ask before guessing." Full technical
write-ups of *finished* work live in `NOTES.md`; this file only tracks what's
still open. Update it as items get built, scoped, or dropped — don't let it
go stale.

Numbering is stable across edits (so past discussion of "item 12" still means
the same thing later); new items append at the end rather than renumbering.

## Open

1. **Unauthenticated marketing/docs pages** — on hold until the product
   framing settles further:
   - Persona landing pages: engineers, founders, product managers.
   - Docs: standard intro/get-started/walkthroughs, plus a "Bones" section
     documenting the design-system tools themselves.
2. **CI/CD** — acknowledged as needed, not started.
4. **API documentation** — backend is mostly tRPC (types are the docs,
   exported as `AppRouter`) + better-auth's own `/api/auth/*` passthrough,
   not a schema'd REST API — plain `@fastify/swagger` would only ever cover
   the trivial `/health` route. Recommended, not built:
   - better-auth's built-in `openAPI()` plugin (`better-auth/plugins`, no new
     dependency) — auto-docs `/api/auth/*`, serves a Scalar reference UI at
     `/api/auth/reference`. Cheap, real value.
   - `trpc-to-openapi` only if a non-TS consumer or shareable reference page
     actually comes up — explicitly deferred otherwise.
7. **Billing** — payments/subscriptions, no detail given yet.
8. **Invitations** — team/org invite flow, no detail given yet (relates to
   Organizations + RBAC).
9. **Jobs** — background job/worker queue, no detail given yet.
10. **Caching** — scope undecided (build caching, in-process caching, HTTP
    caching, or a layer like Redis). Ask which before assuming.
12. **Audit logging (customer-facing)** — the raw infra piece is built
    (`backend/src/lib/logging/`, 2026-09-18: every DB write + every
    HTTP/tRPC request, redacted, rotated, archived to S3 — see NOTES.md's
    "Backend logging infra" entry). Still open: an actual customer-facing,
    org-gated audit trail with human-readable actor names/emails (not raw
    IDs) — semantic entries like "member X was added to org Y," tied to real
    mutations, built as a layer on top of the raw logging rather than a
    replacement for it.
13. **Observability** — logs/metrics/tracing provider, no detail given yet.
15. **Go-to-market strategy** — non-technical, business-side, no detail yet.
16. **DB name should be configurable** — currently hardcoded/env-derived in
    `docker-compose.yml` and backend's `DATABASE_URL`.
17. **`web-static` (public/SEO-facing Next.js site) productionization**:
    - No `robots.txt`/`sitemap.xml` at all yet — not blocked on anything,
      could be done anytime (`public/robots.txt` with `Allow: /`, a
      `sitemap.ts` per Next's App Router convention).
    - `app/layout.tsx`'s `metadata` (title/description/og:image/canonical)
      is still placeholder — genuinely blocked on a real production domain
      and the product pitch being settled. `metadataBase` could still be
      wired to an env var now so productionalizing later is an env change,
      not a code change.
    - How it actually gets *served* is unconfirmed: no `output: "export"`,
      still runs as a Node `next start` service, no `Dockerfile` or
      `docker-compose*.yml` entry — not containerized or wired into local
      infra at all. Needs a static-export-vs-Node-service decision before
      it's production-servable.
18. **`web-app` (authenticated SPA) productionization** — already has its
    own `robots.txt` (`Allow: /`, reasoned that everything past `/` is
    `RequireAuth`-gated anyway). `og:url`/`og:image`/canonical need a real
    domain too, lower priority since almost nothing here is public besides
    `/login`. Confirm the eventual static host rewrites unknown paths to
    `index.html` (needed for `BrowserRouter` deep links + crawlers hitting
    `/login` directly). Revisit whether prerendering any public routes is
    worth it once there's more than one.
19. **Design-system docs gap** — `CLAUDE.md` points at `COMPONENTS.md`
    (per-component specs) and `bones-style-guide.html` (rendered reference)
    as required reading before building UI; neither file exists. Worth
    creating at least a minimal `COMPONENTS.md` once the component set
    stabilizes more.
20. **Storybook** — `.env`'s `TRUSTED_ORIGINS` already whitelists
    `http://localhost:6006` (Storybook's default port) but nothing's set up
    (no `.storybook/`, no dependency). Would fit developing
    `shared-ui`/`web-app` components in isolation.
21. **API keys** — scope TBD: personal per-user keys vs. org-level, scoping/
    permissions on a key, rotation/revocation, rate limiting, where they'd
    be issued/managed in the admin UI. Ask what before guessing.
22. **Accessibility** — scope TBD: a11y audit of existing pages, a specific
    WCAG level to target, screen-reader/keyboard-nav testing, or something
    else. Ask what before guessing.
23. **CDN** — scope TBD: static asset delivery for `web-static`/`web-app`'s
    built assets, S3/CloudFront or another provider, whether this ties into
    item 17's productionization work. Ask what before guessing.
25. **Home (`/`, authenticated)** — still a placeholder, intentionally left
    alone per explicit ask ("I'll think of something to put there").
26. **Backend compute** — decide Fargate vs. App Runner (both AWS, unaffected
    by the DB-hosting decision already made).
27. **Formatter** — none configured yet; oxlint is a linter, not a formatter,
    doesn't cover code style/whitespace. Prettier or otherwise, undecided.
28. **`@aws-sdk/*` version pinning** — the three AWS SDK v3 packages in
    `backend/package.json` are exact-pinned (no `^`), unlike every other
    dependency in that file, and are currently one patch behind latest.
    Confirm whether that's deliberate (reproducible builds against a
    fast-moving SDK) or an oversight worth aligning to the rest of the file.
29. **Node version: v26 vs. v24 LTS** — `.node-version` currently pins the
    latest v26.x, the "Current" release line, not yet Active LTS (graduates
    to LTS in the next few weeks). v24 is the actual Active LTS today with
    support into 2028. Explicitly re-confirmed 2026-09-18: staying on v26
    for now — revisit if that tradeoff ever needs reconsidering.

## Recently resolved (kept briefly for context — see NOTES.md for full accounts)

- Login page rebuilt to the current design system (item 24, closed
  2026-09-18) — done via `8206702` ("Adopt design system, rebuild Login on
  Mantine") and kept current since (email+password, verification, password
  reset, Google added to sign-up, shared auth-page shell hoisted into
  `shared-ui` 2026-09-17). Ended up broader than the original scope: the
  item explicitly excluded email+password, but that was added later as its
  own initiative (see "Email + password auth" in NOTES.md), not as part of
  this item. Microsoft/generic SSO and a marketing-copy proof panel are
  still out of scope, per the original note.
- Backend logging infra (2026-09-18) — see item 12 above; the raw layer is
  done, the customer-facing semantic audit trail is not.
- Default organization seeding (2026-09-18) — every fresh database now
  seeds one organization with roles/features pre-wired; first-ever signup
  still becomes Owner (env-var "creator" bootstrap explicitly considered
  and rejected this pass).
- Organizations / user grouping (2026-09-15/16) — real app-level feature at
  `/organizations`, org-scoped RBAC.
- RBAC: roles/features/feature_roles (2026-09-11) — real DB-backed dynamic
  roles, replacing the old fixed 4-role enum.
- Emailing (2026-09-11) — Amazon SES + email verification + the
  `email-templates` workspace.
- Large file storage (2026-09-08 → resolved 2026-09-14) — S3 via presigned
  URLs, avatar upload as the first real consumer.
- Feature flags — folded into the RBAC work above, not a separate system.

**How to apply:** when this area comes up again, check here first rather
than starting from scratch. Move an item to "Recently resolved" (one line,
pointing at NOTES.md) once it ships, and drop it from there once it's old
enough that NOTES.md alone is the reference anyone would actually reach for.
