import type { Meta, StoryObj } from "@storybook/react-vite";
import { IconHeart, IconSettings, IconTrash } from "@tabler/icons-react";
import { ActionIcon, CloseButton, Group, UnstyledButton, Text } from "@mantine/core";
import { ACCENTS } from "../theme";
import { Page, Section } from "./Section";

const meta = { title: "Components/Actions" } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

const VARIANTS = ["filled", "light", "outline", "subtle", "default", "transparent"] as const;
const SIZES = ["xs", "sm", "md", "lg", "xl"] as const;

function ActionsPage() {
  return (
    <Page title="Actions">
      <Section title="ActionIcon — variants × accent colors">
        {(Object.keys(ACCENTS) as (keyof typeof ACCENTS)[]).map((color) => (
          <Group key={color} gap="sm">
            {VARIANTS.map((variant) => (
              <ActionIcon key={variant} color={color} variant={variant} aria-label={`${color} ${variant}`}>
                <IconHeart size={16} />
              </ActionIcon>
            ))}
          </Group>
        ))}
      </Section>

      <Section title="ActionIcon — sizes">
        <Group align="center" gap="sm">
          {SIZES.map((size) => (
            <ActionIcon key={size} size={size} aria-label={`size ${size}`}>
              <IconSettings size={16} />
            </ActionIcon>
          ))}
        </Group>
      </Section>

      <Section title="CloseButton">
        <Group gap="sm">
          <CloseButton aria-label="Close" />
          <CloseButton size="lg" aria-label="Close large" />
          <CloseButton variant="filled" color="red" aria-label="Close destructive" icon={<IconTrash size={16} />} />
        </Group>
      </Section>

      <Section title="UnstyledButton">
        <UnstyledButton
          style={{
            padding: "0.5rem 0.75rem",
            borderRadius: "var(--mantine-radius-md)",
            border: "1px solid var(--mantine-color-default-border)",
          }}
        >
          <Text size="sm">No default button chrome — build your own from scratch</Text>
        </UnstyledButton>
      </Section>
    </Page>
  );
}

export const Actions: Story = {
  render: () => <ActionsPage />,
};
