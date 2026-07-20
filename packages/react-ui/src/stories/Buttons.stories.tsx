import type { Meta, StoryObj } from "@storybook/react-vite";
import type React from "react";
import { IconBrandGoogle, IconLogout2 } from "@tabler/icons-react";
import { Button, Code, Group, Stack, Text, Title } from "@mantine/core";
import { ACCENTS } from "../theme";

const meta = { title: "Components/Button" } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

const VARIANTS = ["filled", "light", "outline", "subtle", "default"] as const;
const SIZES = ["xs", "sm", "md", "lg", "xl"] as const;

function ButtonsPage() {
  return (
    <Stack gap="xl">
      <Title order={1}>Button</Title>

      <Stack gap="xs">
        <Title order={2}>Variants × accent colors</Title>
        <Text c="dimmed" size="sm">
          Every accent registered in <Code>theme.ts</Code> works with any Mantine Button variant automatically —
          Mantine resolves the right shade per variant/color-scheme on its own.
        </Text>
        {(Object.keys(ACCENTS) as (keyof typeof ACCENTS)[]).map((color) => (
          <Group key={color} gap="sm">
            {VARIANTS.map((variant) => (
              <Button key={variant} color={color} variant={variant}>
                {color} / {variant}
              </Button>
            ))}
          </Group>
        ))}
      </Stack>

      <Stack gap="xs">
        <Title order={2}>Sizes</Title>
        <Group gap="sm" align="center">
          {SIZES.map((size) => (
            <Button key={size} size={size}>
              size {size}
            </Button>
          ))}
        </Group>
      </Stack>

      <Stack gap="xs">
        <Title order={2}>With an icon (leftSection)</Title>
        <Text c="dimmed" size="sm">
          <Code>@tabler/icons-react</Code> is installed for this exact pattern. <Code>Login.tsx</Code> inlines a
          hand-drawn Google &quot;G&quot; instead of a Tabler icon — Google&apos;s brand guidelines require their
          exact multicolor mark — but any other icon button should reach for Tabler.
        </Text>
        <Group gap="sm">
          <Button leftSection={<IconBrandGoogle size={18} />} variant="default">
            Tabler brand icon
          </Button>
          <Button leftSection={<IconLogout2 size={18} />} variant="default">
            Log out
          </Button>
        </Group>
      </Stack>

      <Stack gap="xs">
        <Title order={2}>Lighter-on-hover override</Title>
        <Text c="dimmed" size="sm">
          Mantine&apos;s filled variant darkens on hover by default (one shade down). The &quot;Continue with
          Google&quot; button in <Code>Login.tsx</Code> overrides this to hover <em>lighter</em> instead, via the{" "}
          <Code>--button-hover</Code> CSS var Button reads internally — this has to go through the plain{" "}
          <Code>style</Code> prop, not the <Code>styles</Code> style-api prop: Mantine writes its own vars directly
          into the element&apos;s inline <Code>style</Code> attribute, and an external stylesheet rule from{" "}
          <Code>styles</Code> can never out-specificity an inline style.
        </Text>
        <Button color="green" style={{ "--button-hover": "var(--mantine-color-green-4)" } as React.CSSProperties}>
          Hover me
        </Button>
      </Stack>
    </Stack>
  );
}

export const Buttons: Story = {
  render: () => <ButtonsPage />,
};
