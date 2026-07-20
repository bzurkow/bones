import type { Meta, StoryObj } from "@storybook/react-vite";
import { IconBell, IconMail } from "@tabler/icons-react";
import {
  Avatar,
  Badge,
  Blockquote,
  Card,
  Group,
  Indicator,
  Kbd,
  List,
  Mark,
  Spoiler,
  Stack,
  Table,
  Text,
  ThemeIcon,
  Timeline,
} from "@mantine/core";
import { ACCENTS } from "../theme";
import { Page, Section } from "./Section";

const meta = { title: "Components/Data Display" } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

const VARIANTS = ["filled", "light", "outline", "dot"] as const;

function DataDisplayPage() {
  return (
    <Page title="Data display">
      <Section title="Avatar">
        <Group gap="sm">
          <Avatar radius="xl">BZ</Avatar>
          <Avatar color="green" radius="xl">
            PL
          </Avatar>
          <Avatar.Group>
            <Avatar radius="xl">A</Avatar>
            <Avatar radius="xl">B</Avatar>
            <Avatar radius="xl">+3</Avatar>
          </Avatar.Group>
        </Group>
      </Section>

      <Section title="Badge — variants × accent colors">
        {(Object.keys(ACCENTS) as (keyof typeof ACCENTS)[]).map((color) => (
          <Group key={color} gap="sm">
            {VARIANTS.map((variant) => (
              <Badge key={variant} color={color} variant={variant}>
                {color} {variant}
              </Badge>
            ))}
          </Group>
        ))}
      </Section>

      <Section title="Card">
        <Card withBorder radius="md" maw={320} p="md">
          <Group justify="space-between" mb="xs">
            <Text fw={600}>Gmail</Text>
            <Badge color="green" variant="light">
              Connected
            </Badge>
          </Group>
          <Text size="sm" c="dimmed">
            12 new notifications since you last checked.
          </Text>
        </Card>
      </Section>

      <Section title="Table">
        <Table maw={480}>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Source</Table.Th>
              <Table.Th>Status</Table.Th>
              <Table.Th>Unread</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {[
              ["Gmail", "Connected", "12"],
              ["Slack", "Connected", "3"],
              ["Discord", "Not connected", "—"],
            ].map(([source, status, unread]) => (
              <Table.Tr key={source}>
                <Table.Td>{source}</Table.Td>
                <Table.Td>{status}</Table.Td>
                <Table.Td>{unread}</Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Section>

      <Section title="List">
        <List>
          <List.Item>Poll the source's REST API on a timer (v1)</List.Item>
          <List.Item>Open a WebSocket/SSE connection to our backend relay (v2)</List.Item>
        </List>
      </Section>

      <Section title="Indicator / ThemeIcon">
        <Group gap="xl" align="center">
          <Indicator label="9" size={16} color="red">
            <ThemeIcon size="lg" radius="xl" variant="light">
              <IconBell size={18} />
            </ThemeIcon>
          </Indicator>
          <ThemeIcon size="lg" radius="xl" color="green">
            <IconMail size={18} />
          </ThemeIcon>
        </Group>
      </Section>

      <Section title="Timeline">
        <Timeline active={1} maw={360}>
          <Timeline.Item title="Backend scaffolded">Fastify + tRPC, validated end to end</Timeline.Item>
          <Timeline.Item title="Auth wired up">Better Auth with Google, desktop deep link</Timeline.Item>
          <Timeline.Item title="First connector">Not started yet</Timeline.Item>
        </Timeline>
      </Section>

      <Section title="Kbd / Mark / Blockquote">
        <Stack gap="sm">
          <Text size="sm">
            Press <Kbd>⌘</Kbd> + <Kbd>R</Kbd> to reload the Tauri webview.
          </Text>
          <Text size="sm">
            The <Mark color="green">landing page</Mark> switches between Login and Logout based on session state.
          </Text>
          <Blockquote color="blue">
            Connector logic lives in TypeScript, not Rust — better SDKs for Gmail/Slack/Discord.
          </Blockquote>
        </Stack>
      </Section>

      <Section title="Spoiler">
        <Spoiler maxHeight={40} showLabel="Show more" hideLabel="Show less" maw={400}>
          <Text size="sm">
            No unauthenticated use — the whole app UI gates on a valid session before rendering anything. SSO login
            required, starting with Google, but the architecture must support adding any provider without rework.
          </Text>
        </Spoiler>
      </Section>
    </Page>
  );
}

export const DataDisplay: Story = {
  render: () => <DataDisplayPage />,
};
