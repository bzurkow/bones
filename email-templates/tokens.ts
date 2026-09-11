// GENERATED FILE -- do not edit by hand. Regenerate with
// `yarn generate-tokens` (run automatically before both `yarn dev` and
// `yarn build` in this package -- see scripts/generate-tokens.js and
// package.json). Source of truth is shared-ui/src/tokens.css's light-mode
// `:root` block; add or change a color there and rerun, never here.
//
// Light-mode values only, deliberately -- emails always render in light
// mode (see verification-email.tsx's colorScheme meta tags, which also
// actively opt out of client-side dark-mode auto-inversion), so there is
// no dark-mode half of this file, unlike tokens.css's own `:root` +
// `:root[data-mantine-color-scheme="dark"]` split.
//
// Web fonts (Instrument Sans/JetBrains Mono) aren't reliably loadable in
// email clients -- most strip @font-face/external font <link>s entirely
// (Outlook and Gmail notably), so in practice every client falls back to
// fontSans/fontMono's system-font tail regardless. Listed first anyway
// (some clients -- Apple Mail, some webmail -- do honor it), in the same
// fallback order tokens.css uses.
export const emailTokens = {
  ink: "#0A0A0A",
  inkHover: "#333333",
  body: "#3A3A3A",
  muted: "#6E6E6E",
  subtle: "#8A8A8A",
  disabledText: "#A8A8A8",
  inactive: "#C8C8C8",
  bg: "#FFFFFF",
  surface: "#FAFAFA",
  border: "#E4E4E4",
  borderFaint: "#EDEDED",
  borderStrong: "#0A0A0A",
  disabledBg: "#F2F2F2",
  block1: "#F4F4F4",
  block2: "#EAEAEA",
  block3: "#D8D8D8",
  danger: "#B42318",
  statusActive: "#15803D",
  statusInactive: "#B42318",
  fontSans: "'Instrument Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif",
  fontMono: "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace",
  radiusSm: "8px",
  radiusMd: "9px",
  radiusLg: "14px",
  radiusXl: "16px",
  maxWidth: "1180px",
  gutter: "32px",
  sectionGap: "128px",
  shadowFrame: "0 24px 60px -30px rgba(10, 10, 10, 0.28)",
  headerBg: "rgba(255, 255, 255, 0.88)",
  codeBg: "#0A0A0A",
  codeText: "#D6D6D6",
  codeMuted: "#6E6E6E",
  codeEmphasis: "#FFFFFF",
  codeBorder: "#262626",
  codeBorderFaint: "#1C1C1C",
} as const;
