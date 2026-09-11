// Duplicated from shared-ui/src/tokens.css's light-mode `:root` block, not
// imported from it -- shared-ui ships unbuilt, raw TypeScript/CSS (fine for
// Vite/Next, which transpile it themselves) with no build step, so it can't
// be a real runtime dependency of a plain-Node package like this one; this
// is the same class of cross-runtime-boundary duplication backend/src/
// auth.ts's PASSWORD_RULES_MESSAGE/isStrongPassword already has with
// web-app/src/AuthHelpers/password-rules.ts, for the same underlying reason
// (backend's own exports are types-only). Keep these in sync by hand if
// tokens.css's light values change -- there is no automated check for that
// yet, same as the password-rules precedent.
//
// Light-mode values ONLY, deliberately -- emails always render in light
// mode (see verification-email.tsx's colorScheme meta tags, which also
// actively opt out of client-side dark-mode auto-inversion), so there is no
// dark-mode half to this file at all, unlike tokens.css's own `:root` +
// `:root[data-mantine-color-scheme="dark"]` split.
export const emailTokens = {
  ink: "#0A0A0A",
  muted: "#6E6E6E",
  subtle: "#8A8A8A",
  border: "#E4E4E4",
  bg: "#FFFFFF",
  surface: "#FAFAFA",
  // Web fonts (Instrument Sans/JetBrains Mono) aren't reliably loadable in
  // email clients -- most strip @font-face/external font <link>s entirely
  // (Outlook and Gmail notably), so in practice every client falls back to
  // this stack's system fonts regardless. Listed first anyway (some clients
  // -- Apple Mail, some webmail -- do honor it) with the same fallback
  // order tokens.css uses, so the two only ever diverge if tokens.css's own
  // fallback order changes.
  fontSans: "'Instrument Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif",
  radiusMd: "9px",
} as const;
