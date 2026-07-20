import type { Meta, StoryObj } from "@storybook/react-vite";
import { Badge, Code, Group, Stack, Text, Title } from "@mantine/core";
import { ACCENTS, NEUTRAL, theme } from "../theme";

const meta = { title: "Foundations/Colors" } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

function Swatch({ value, label }: { value: string; label: string }) {
  return (
    <Stack gap={4} align="center">
      <div
        style={{
          width: 60,
          height: 60,
          borderRadius: 8,
          background: value,
          border: "1px solid var(--mantine-color-default-border)",
        }}
      />
      <Text size="xs" ff="monospace">
        {label}
      </Text>
    </Stack>
  );
}

function AccentRamp({ name }: { name: keyof typeof ACCENTS }) {
  const spec = ACCENTS[name];
  // theme.colors is generated in theme.ts directly from ACCENTS' keys, so
  // every {name}Light/{name}Dark ramp is guaranteed to exist here --
  // createTheme()'s return type just keeps `colors` optional since it
  // mirrors its (partial) input rather than the fully-resolved theme.
  const colors = theme.colors!;
  const lightRamp = colors[`${name}Light`]!;
  const darkRamp = colors[`${name}Dark`]!;

  return (
    <Stack gap="xs">
      <Group gap="xs" align="center">
        <Title order={4} tt="capitalize">
          {name}
        </Title>
        <Badge variant="light" color={name}>
          hue {spec.hue} · chroma {spec.chroma}
        </Badge>
      </Group>

      <Text size="xs" c="dimmed">
        Light backing — anchored at shade 6, {spec.light}% L
      </Text>
      <Group gap={4}>
        {lightRamp.map((value, i) => (
          <Swatch key={i} value={value} label={String(i)} />
        ))}
      </Group>

      <Text size="xs" c="dimmed">
        Dark backing — anchored at shade 8, {spec.dark}% L
      </Text>
      <Group gap={4}>
        {darkRamp.map((value, i) => (
          <Swatch key={i} value={value} label={String(i)} />
        ))}
      </Group>
    </Stack>
  );
}

function NeutralRow({ mode }: { mode: "light" | "dark" }) {
  const tokens = NEUTRAL[mode];
  return (
    <Stack gap="xs">
      <Title order={4} tt="capitalize">
        {mode}
      </Title>
      <Group gap="md">
        {Object.entries(tokens).map(([key, value]) => (
          <Swatch key={key} value={value} label={key} />
        ))}
      </Group>
    </Stack>
  );
}

function ColorsPage() {
  return (
    <Stack gap="xl" maw={900}>
      <Stack gap={4}>
        <Title order={1}>Theme colors</Title>
        <Text c="dimmed" size="sm">
          Every accent is registered as a Mantine <Code>virtualColor</Code> in <Code>theme.ts</Code>, backed by a
          light ramp and a dark ramp. Each ramp comes from <Code>buildRamp()</Code>, which interpolates a full
          10-stop Mantine tuple around a single exact OKLCH value taken from the design handoff — pinned at shade 6
          for light mode and shade 8 for dark, the shades Mantine&apos;s filled/primary variant actually uses by
          default. Reference a color by name (e.g. <Code>{`color="green"`}</Code>) and Mantine resolves the right
          backing ramp for whichever color scheme is active automatically.
        </Text>
      </Stack>

      <Title order={2}>Accents</Title>
      {(Object.keys(ACCENTS) as (keyof typeof ACCENTS)[]).map((name) => (
        <AccentRamp key={name} name={name} />
      ))}

      <Stack gap={4}>
        <Title order={2}>Neutral tokens</Title>
        <Text c="dimmed" size="sm">
          Background/surface/border/text tokens aren&apos;t part of the Mantine color system — they&apos;re applied
          directly via <Code>cssVariablesResolver</Code> in <Code>theme.ts</Code>, overriding Mantine&apos;s own{" "}
          <Code>--mantine-color-body</Code> / <Code>--mantine-color-text</Code> / etc, plus three app-specific{" "}
          <Code>--app-color-*</Code> variables (surface / surfaceAlt / border) that Mantine has no built-in
          equivalent for.
        </Text>
      </Stack>
      <NeutralRow mode="light" />
      <NeutralRow mode="dark" />
    </Stack>
  );
}

export const Colors: Story = {
  render: () => <ColorsPage />,
};
