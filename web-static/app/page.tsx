"use client";

import { BonesMark, Button, CardGrid, CodePanel, Eyebrow } from "shared-ui";
import type { CardGridItem } from "shared-ui";
import styles from "./page.module.css";

// Copy below is carried over verbatim from the design handoff
// (bone_handoff/source/Bones Landing.dc.html) -- it describes Bones as a
// self-service app-generator SaaS, which NOTES.md's "Vision" section flags
// as not-yet-confirmed-accurate ("toolkit an AI can use," not settled what
// that means operationally). Structure/visual system is confirmed and
// implemented for real below; this specific wording is a placeholder,
// same status as bones-future-ideas.html's parked content -- expect to
// revise once the product framing is nailed down.

// The application itself lives on a separate origin now (web-app/, the
// app.-subdomain) -- see NOTES.md's marketing/app split entry.
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://app.localhost:5173";

const STACK_ITEMS: CardGridItem[] = [
  {
    index: "01 · AUTH",
    title: "SSO on day one",
    description:
      "SAML and OIDC wired to Okta, Entra, and Google Workspace. Sessions, refresh, SCIM provisioning, and role-based access already in the codebase — not a paid add-on later.",
  },
  {
    index: "02 · DATA",
    title: "A real database",
    description:
      "Postgres with a normalized schema drawn from your description, versioned migrations, seed data, and indexes where the queries actually need them.",
  },
  {
    index: "03 · API",
    title: "Typed API layer",
    description:
      "End-to-end typed routes with validation, pagination, and error shapes that match. An OpenAPI spec falls out of it, so other teams can integrate immediately.",
  },
  {
    index: "04 · PUBLISH",
    title: "Ship to your cloud",
    description: "Push to the cloud — with Terraform, a CI pipeline, preview environments per branch, and DNS and TLS handled.",
  },
  {
    index: "05 · OPS",
    title: "Secrets and environments",
    description:
      "Dev, staging, and production separated properly, secrets in your vault rather than a .env you email around, and backups scheduled from the first deploy.",
  },
  {
    index: "06 · VISIBILITY",
    title: "Logs, metrics, audit trail",
    description:
      "Structured logging, health checks, and an append-only audit log of who changed what — the first three things every security review asks for.",
  },
];

const STEPS = [
  {
    index: "01",
    title: "Bones wires the stack",
    body: "Describe who signs in and what the app stores. Schema, roles, API routes, and screens are generated together, so permissions in the UI match the ones enforced on the server.",
  },
  {
    index: "02",
    title: "Connect to your cloud provider",
    body: "Point Bones at your own account and it writes the Terraform, the CI pipeline, and the secrets wiring. Your infrastructure, under your billing.",
  },
  {
    index: "03",
    title: "Develop and launch",
    body: "Keep building in Bones, or push to GitHub and take it into your own editor. There is no Bones runtime in production, so nothing breaks when you leave.",
  },
];

const OUTPUT_ROWS = [
  "Standard frameworks, no proprietary runtime",
  "Auth and permissions enforced server-side, not just hidden in the UI",
  "Migrations you can run yourself, against your own Postgres",
  "Infrastructure as code in your cloud account, under your billing",
  "MIT-licensed output that keeps running after you cancel",
];

const OUTPUT_CODE = `export const invoices = router({
  list: procedure
    .use(requireRole("client"))
    .input(z.object({ cursor: z.string().nullish() }))
    .query(({ ctx, input }) =>
      db.invoice.findMany({
        where: { orgId: ctx.session.orgId },
        take: 25,
        cursor: input.cursor,
      })
    ),
});`;

export default function Home() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={`${styles.container} ${styles.headerInner}`}>
          <a href="#top" className={styles.brand}>
            <BonesMark size={24} />
            <span className={styles.wordmark}>Bones</span>
          </a>
          <nav className={styles.nav}>
            <a href="#stack" className={styles.navLink}>
              What's included
            </a>
            <a href="#how" className={styles.navLink}>
              How it works
            </a>
            <a href="#own" className={styles.navLink}>
              The output
            </a>
            <Button component="a" href={`${APP_URL}/login`} size="sm">
              Start building
            </Button>
          </nav>
        </div>
      </header>

      <section id="top" className={`${styles.container} ${styles.hero}`}>
        <Eyebrow pill>THE PAGE IS THE EASY PART. WE DO THE REST.</Eyebrow>
        <h1 className={styles.heroHeading}>Auth, database, and API — generated with the page.</h1>
        <p className={styles.heroLead}>
          Describe your product and Bones builds the whole thing: SSO your customers' IT teams will approve, a real
          Postgres schema, a typed API layer, and a push to the cloud. You own every file.
        </p>
        <div className={styles.ctaRow}>
          <Button component="a" href={`${APP_URL}/login`}>
            Start building
          </Button>
          <Button variant="secondary" component="a" href="#stack">
            See what's included
          </Button>
        </div>
      </section>

      <section id="stack" className={styles.container} style={{ paddingTop: "var(--bones-section-gap)" }}>
        <div className={styles.sectionHead}>
          <Eyebrow>What's included</Eyebrow>
          <h2 className={styles.sectionHeading}>The six weeks of plumbing, done before you open the editor.</h2>
        </div>
        <div style={{ marginTop: 48 }}>
          <CardGrid items={STACK_ITEMS} />
        </div>
      </section>

      <section id="how" className={`${styles.container} ${styles.section}`}>
        <div className={styles.sectionHead}>
          <Eyebrow>How it works</Eyebrow>
          <h2 className={styles.sectionHeading}>Three steps, and none of them are "pick a template."</h2>
        </div>
        <div className={styles.steps}>
          {STEPS.map((step) => (
            <div className={styles.step} key={step.index}>
              <div className={styles.stepIndex}>{step.index}</div>
              <h3 className={styles.stepTitle}>{step.title}</h3>
              <p className={styles.stepBody}>{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="own" className={`${styles.container} ${styles.section}`}>
        <div className={styles.outputGrid}>
          <div className={styles.outputCopy}>
            <Eyebrow>The output</Eyebrow>
            <h2 className={styles.sectionHeading}>A repository a developer would be happy to inherit.</h2>
            <p className={styles.outputLead}>
              Most generators hand you a hosted page and a bill. Bones hands you the whole system — application,
              server, schema, and infrastructure — in files you can read, review, and fork.
            </p>
            <ul className={styles.outputList}>
              {OUTPUT_ROWS.map((row) => (
                <li key={row}>{row}</li>
              ))}
            </ul>
          </div>
          <CodePanel filename="server/api/invoices.ts" code={OUTPUT_CODE} />
        </div>
      </section>

      <section className={styles.finalCta}>
        <div className={styles.finalCtaInner}>
          <BonesMark size={34} />
          <h2 className={styles.finalCtaHeading}>Start with a sentence. Ship with a stack.</h2>
          <p className={styles.finalCtaLead}>First project is free, and the export button works before you ever enter a card.</p>
          <div className={styles.ctaRow}>
            <Button component="a" href={`${APP_URL}/login`}>
              Generate your first app
            </Button>
            <Button variant="secondary" component="a" href="#own">
              Read the output spec
            </Button>
          </div>
        </div>
      </section>

      <footer className={styles.footer}>
        <div className={`${styles.container} ${styles.footerGrid}`}>
          <div className={styles.footerBrand}>
            <div className={styles.footerBrandRow}>
              <BonesMark size={20} />
              <span className={styles.footerBrandName}>Bones</span>
            </div>
            <p className={styles.footerTagline}>Websites and the systems underneath them, generated as source you own.</p>
          </div>
          <div className={styles.footerColumn}>
            <span className={styles.footerColumnHeading}>PRODUCT</span>
            <a href="#stack" className={styles.footerLink}>
              What's included
            </a>
            <a href="#how" className={styles.footerLink}>
              How it works
            </a>
          </div>
          <div className={styles.footerColumn}>
            <span className={styles.footerColumnHeading}>DEVELOPERS</span>
            <a href="#own" className={styles.footerLink}>
              Output spec
            </a>
            <a href="#own" className={styles.footerLink}>
              Deploy targets
            </a>
            <a href="#own" className={styles.footerLink}>
              API reference
            </a>
            <a href="#own" className={styles.footerLink}>
              Changelog
            </a>
          </div>
          <div className={styles.footerColumn}>
            <span className={styles.footerColumnHeading}>COMPANY</span>
            <a href="#top" className={styles.footerLink}>
              About
            </a>
            <a href="#top" className={styles.footerLink}>
              Security
            </a>
            <a href="#top" className={styles.footerLink}>
              Privacy
            </a>
            <a href="#top" className={styles.footerLink}>
              Contact
            </a>
          </div>
        </div>
        <div className={`${styles.container} ${styles.footerBottom}`}>
          <div className={styles.footerBottomInner}>
            <span>© 2026 Bones</span>
            <span>Built with Bones</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
