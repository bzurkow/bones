import { Button, createTheme } from "@mantine/core";
import type { MantineColorsTuple } from "@mantine/core";

// The design system's whole palette, in one Mantine color scale (lightest
// to darkest, matching Mantine's own convention) -- see tokens.css for the
// canonical hex values and what each one means. Kept mostly for
// completeness/other Mantine components; the pixel-exact work (Button
// below) reads tokens.css's CSS variables directly instead of this scale,
// since Mantine's automatic shade-picking doesn't reliably land on the
// literal COMPONENTS.md values.
const ink: MantineColorsTuple = [
  "#FFFFFF",
  "#FAFAFA",
  "#F2F2F2",
  "#EDEDED",
  "#E4E4E4",
  "#C8C8C8",
  "#A8A8A8",
  "#8A8A8A",
  "#6E6E6E",
  "#0A0A0A",
];

export const theme = createTheme({
  primaryColor: "ink",
  colors: { ink },
  fontFamily: "var(--bones-font-sans)",
  fontFamilyMonospace: "var(--bones-font-mono)",
  defaultRadius: "md",
  radius: {
    xs: "var(--bones-radius-sm)",
    sm: "var(--bones-radius-sm)",
    md: "var(--bones-radius-md)",
    lg: "var(--bones-radius-lg)",
    xl: "var(--bones-radius-xl)",
  },
  // "Borders, not shadows" (CLAUDE.md rule 3) -- Mantine's default shadow
  // scale is unused by this design entirely, so zero it out globally
  // rather than remembering to omit `shadow` on every component instance.
  shadows: { xs: "none", sm: "none", md: "none", lg: "none", xl: "none" },
  components: {
    // Maps COMPONENTS.md's 4 variants x 2 sizes onto Mantine's Button --
    // see components/Button for the thin wrapper that translates our
    // variant names (primary/secondary/quiet/text) to the Mantine variant
    // this keys off of.
    //
    // Colors/border/radius/font-size go through `vars` (real CSS custom
    // properties -- Mantine's own shipped Button.css already has real
    // :hover/:disabled selectors reading these, e.g.
    // `:hover { background-color: var(--button-hover, ...) }`), NOT
    // `styles`: `styles` becomes a literal inline `style` attribute
    // (React's CSSProperties), which can't express pseudo-selectors at
    // all -- a `"&:hover": {...}` key inside it is just silently ignored
    // rather than becoming real CSS. `styles` is only used below for the
    // handful of static, non-hover-dependent box-model properties Mantine
    // doesn't expose a CSS variable for (vertical padding, height, and
    // font-weight/family).
    Button: Button.extend({
      defaultProps: { size: "md" },
      styles: (_theme, props) => {
        const sm = props.size === "sm";
        const isText = props.variant === "subtle";
        return {
          root: {
            fontFamily: "var(--bones-font-sans)",
            fontWeight: 600,
            height: "auto",
            padding: isText ? "0 0 2px" : sm ? "9px 18px" : "13px 26px",
          },
          // Mantine's own label wrapper is height:100% (of an auto-height
          // root -- resolves too tight) + overflow:hidden (see
          // node_modules/@mantine/core/styles/Button.css), which physically
          // clips descenders (the "g" in "Google") regardless of root's
          // padding. Let the label take its natural size instead.
          label: { height: "auto", overflow: "visible" },
          inner: { height: "auto" },
        };
      },
      vars: (_theme, props) => {
        const sm = props.size === "sm";
        const fz = sm ? "14.5px" : "15.5px";
        const radius = sm ? "var(--bones-radius-sm)" : "var(--bones-radius-md)";

        switch (props.variant) {
          case "filled": // primary
            return {
              root: {
                "--button-bg": "var(--bones-ink)",
                "--button-hover": "var(--bones-ink-hover)",
                "--button-color": "var(--bones-bg)",
                "--button-bd": "1px solid transparent",
                "--button-radius": radius,
                "--button-fz": fz,
              },
            };
          case "outline": // secondary
            return {
              root: {
                "--button-bg": "transparent",
                "--button-hover": "var(--bones-surface)",
                "--button-color": "var(--bones-ink)",
                "--button-hover-color": "var(--bones-ink)",
                "--button-bd": "1px solid var(--bones-ink)",
                "--button-radius": radius,
                "--button-fz": fz,
              },
            };
          case "subtle": // text -- underline treatment, not a real button box
            return {
              root: {
                "--button-bg": "transparent",
                "--button-hover": "transparent",
                "--button-color": "var(--bones-ink)",
                "--button-hover-color": "var(--bones-muted)",
                "--button-bd": "none",
                "--button-radius": "0",
                "--button-fz": fz,
              },
            };
          default: // "default" -- quiet
            return {
              root: {
                "--button-bg": "transparent",
                "--button-hover": "var(--bones-surface)",
                "--button-color": "var(--bones-ink)",
                "--button-hover-color": "var(--bones-ink)",
                "--button-bd": "1px solid var(--bones-border)",
                "--button-radius": radius,
                "--button-fz": fz,
              },
            };
        }
      },
    }),
  },
});
