// Mantine's documented Next.js PostCSS setup -- postcss-preset-mantine
// resolves its CSS functions/mixins (light-dark(), rem(), etc.), and
// postcss-simple-vars supplies the breakpoint variables those mixins
// reference. Needed because `ui`'s Button/theme.ts depend on Mantine's
// CSS-variable-based styling working the same way it does under Vite.
export default {
  plugins: {
    "postcss-preset-mantine": {},
    "postcss-simple-vars": {
      variables: {
        "mantine-breakpoint-xs": "36em",
        "mantine-breakpoint-sm": "48em",
        "mantine-breakpoint-md": "62em",
        "mantine-breakpoint-lg": "75em",
        "mantine-breakpoint-xl": "88em",
      },
    },
  },
};
