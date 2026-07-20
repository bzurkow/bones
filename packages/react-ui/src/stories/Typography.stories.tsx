import type { Meta, StoryObj } from "@storybook/react-vite";
import { Code, Stack, Text, Title } from "@mantine/core";

const meta = { title: "Foundations/Typography" } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

const TITLE_ORDERS = [1, 2, 3, 4, 5, 6] as const;
const TEXT_SIZES = ["xs", "sm", "md", "lg", "xl"] as const;

function TypographyPage() {
  return (
    <Stack gap="xl" maw={700}>
      <Title order={1}>Typography</Title>

      <Stack gap="xs">
        <Title order={2}>Titles</Title>
        {TITLE_ORDERS.map((order) => (
          <Title key={order} order={order}>
            {`order={${order}}`} — Platypus
          </Title>
        ))}
      </Stack>

      <Stack gap="xs">
        <Title order={2}>Text sizes</Title>
        {TEXT_SIZES.map((size) => (
          <Text key={size} size={size}>
            {`size="${size}"`} — All your notifications, in one place.
          </Text>
        ))}
      </Stack>

      <Stack gap="xs">
        <Title order={2}>Dimmed text</Title>
        <Text c="dimmed">
          <Code>{`c="dimmed"`}</Code> resolves to <Code>NEUTRAL.textMuted</Code> via the CSS variable resolver, not
          Mantine&apos;s default dimmed gray.
        </Text>
      </Stack>
    </Stack>
  );
}

export const Typography: Story = {
  render: () => <TypographyPage />,
};
