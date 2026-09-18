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
  ink: "#0a0a0a",
  inkHover: "#333333",
  body: "#3a3a3a",
  muted: "#6e6e6e",
  subtle: "#8a8a8a",
  disabledText: "#a8a8a8",
  inactive: "#c8c8c8",
  bg: "#ffffff",
  surface: "#fafafa",
  border: "#e4e4e4",
  borderFaint: "#ededed",
  borderStrong: "#0a0a0a",
  disabledBg: "#f2f2f2",
  block1: "#f4f4f4",
  block2: "#eaeaea",
  block3: "#d8d8d8",
  danger: "#b42318",
  fontSans: '"Instrument Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
  fontMono: '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace',
  radiusSm: "8px",
  radiusMd: "9px",
  radiusLg: "14px",
  radiusXl: "16px",
  maxWidth: "1180px",
  gutter: "32px",
  sectionGap: "128px",
  shadowFrame: "0 24px 60px -30px rgba(10, 10, 10, 0.28)",
  shadowPromptBar: "0 1px 2px rgba(10, 10, 10, 0.05)",
  headerBg: "rgba(255, 255, 255, 0.88)",
  codeBg: "#0a0a0a",
  codeText: "#d6d6d6",
  codeMuted: "#6e6e6e",
  codeEmphasis: "#ffffff",
  codeBorder: "#262626",
  codeBorderFaint: "#1c1c1c",
} as const;
