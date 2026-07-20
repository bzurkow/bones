import {
  createTheme,
  defaultCssVariablesResolver,
  virtualColor,
  type CSSVariablesResolver,
  type MantineColorsTuple,
} from "@mantine/core";

// Ported from Downloads/design_handoff_color_scheme (README + "Color Scheme.dc.html").
// That handoff gives one exact oklch value per accent per mode (light/dark), not a full
// shade ramp -- Mantine needs a 10-stop tuple per color, so buildRamp interpolates the
// surrounding stops while pinning the exact handoff value at the shade Mantine actually
// uses for the primary/filled variant (shade 6 in light mode, 8 in dark, its own
// defaults -- see DEFAULT_THEME.primaryShade).

interface AccentSpec {
  hue: number;
  chroma: number;
  light: number;
  dark: number;
}

const ACCENTS = {
  blue: { hue: 255, chroma: 0.13, light: 58, dark: 68 },
  green: { hue: 150, chroma: 0.13, light: 58, dark: 68 },
  purple: { hue: 300, chroma: 0.13, light: 58, dark: 68 },
  pink: { hue: 350, chroma: 0.13, light: 62, dark: 72 },
} satisfies Record<string, AccentSpec>;

export const NEUTRAL = {
  light: {
    background: "oklch(98% 0.006 260)",
    surface: "oklch(100% 0.003 260)",
    surfaceAlt: "oklch(95% 0.008 260)",
    border: "oklch(90% 0.008 260)",
    text: "oklch(22% 0.012 260)",
    textMuted: "oklch(50% 0.012 260)",
  },
  dark: {
    background: "oklch(18% 0.012 260)",
    surface: "oklch(23% 0.014 260)",
    surfaceAlt: "oklch(27% 0.016 260)",
    border: "oklch(32% 0.016 260)",
    text: "oklch(94% 0.006 260)",
    textMuted: "oklch(68% 0.012 260)",
  },
} as const;

function buildRamp(hue: number, chroma: number, anchorIndex: number, anchorLightness: number): MantineColorsTuple {
  const lightestL = 97;
  const darkestL = 20;
  const stops = Array.from({ length: 10 }, (_, i) => {
    const l =
      i <= anchorIndex
        ? lightestL + ((anchorLightness - lightestL) * i) / anchorIndex
        : anchorLightness + ((darkestL - anchorLightness) * (i - anchorIndex)) / (9 - anchorIndex);
    const sideLength = i <= anchorIndex ? anchorIndex : 9 - anchorIndex;
    const distanceFromAnchor = sideLength === 0 ? 0 : Math.abs(i - anchorIndex) / sideLength;
    const c = chroma * (1 - 0.45 * distanceFromAnchor);
    return `oklch(${l.toFixed(1)}% ${c.toFixed(3)} ${hue})`;
  });
  return stops as unknown as MantineColorsTuple;
}

// virtualColor's light/dark fields reference *other* named colors in the palette
// (looked up as theme.colors[name]) rather than taking tuples directly, so each accent
// needs its own light/dark backing ramp registered before it can be aliased.
const backingRamps: Record<string, MantineColorsTuple> = {};
const accentColors: Record<string, MantineColorsTuple> = {};
for (const [name, { hue, chroma, light, dark }] of Object.entries(ACCENTS)) {
  const lightName = `${name}Light`;
  const darkName = `${name}Dark`;
  backingRamps[lightName] = buildRamp(hue, chroma, 6, light);
  backingRamps[darkName] = buildRamp(hue, chroma, 8, dark);
  accentColors[name] = virtualColor({ name, light: lightName, dark: darkName });
}

export const theme = createTheme({
  primaryColor: "blue",
  defaultRadius: "md",
  colors: { ...backingRamps, ...accentColors } as Record<string, MantineColorsTuple>,
});

export function cssVariablesResolver(currentTheme: Parameters<CSSVariablesResolver>[0]): ReturnType<CSSVariablesResolver> {
  const base = defaultCssVariablesResolver(currentTheme);
  return {
    variables: base.variables,
    light: {
      ...base.light,
      "--mantine-color-body": NEUTRAL.light.background,
      "--mantine-color-text": NEUTRAL.light.text,
      "--mantine-color-dimmed": NEUTRAL.light.textMuted,
      "--mantine-color-default-border": NEUTRAL.light.border,
      "--app-color-surface": NEUTRAL.light.surface,
      "--app-color-surface-alt": NEUTRAL.light.surfaceAlt,
      "--app-color-border": NEUTRAL.light.border,
    },
    dark: {
      ...base.dark,
      "--mantine-color-body": NEUTRAL.dark.background,
      "--mantine-color-text": NEUTRAL.dark.text,
      "--mantine-color-dimmed": NEUTRAL.dark.textMuted,
      "--mantine-color-default-border": NEUTRAL.dark.border,
      "--app-color-surface": NEUTRAL.dark.surface,
      "--app-color-surface-alt": NEUTRAL.dark.surfaceAlt,
      "--app-color-border": NEUTRAL.dark.border,
    },
  };
};
