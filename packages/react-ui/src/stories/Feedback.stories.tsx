import type { Meta, StoryObj } from "@storybook/react-vite";
import { IconAlertTriangle, IconCheck } from "@tabler/icons-react";
import { Alert, Group, Loader, Notification, Progress, RingProgress, Skeleton, Stack } from "@mantine/core";
import { Page, Section } from "./Section";

const meta = { title: "Components/Feedback" } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

const LOADER_SIZES = ["xs", "sm", "md", "lg", "xl"] as const;

function FeedbackPage() {
  return (
    <Page title="Feedback">
      <Section title="Alert">
        <Stack maw={480} gap="sm">
          <Alert color="green" icon={<IconCheck size={16} />} title="Connected">
            Gmail is polling successfully.
          </Alert>
          <Alert color="red" variant="light" icon={<IconAlertTriangle size={16} />} title="Sync failed">
            Slack token expired — reconnect from settings.
          </Alert>
        </Stack>
      </Section>

      <Section title="Loader">
        <Group align="center" gap="lg">
          {LOADER_SIZES.map((size) => (
            <Loader key={size} size={size} />
          ))}
          <Loader type="bars" />
          <Loader type="dots" />
        </Group>
      </Section>

      <Section title="Progress / RingProgress">
        <Stack maw={360} gap="lg">
          <Progress value={65} />
          <Progress.Root size={20}>
            <Progress.Section value={40} color="blue">
              <Progress.Label>Gmail</Progress.Label>
            </Progress.Section>
            <Progress.Section value={25} color="green">
              <Progress.Label>Slack</Progress.Label>
            </Progress.Section>
          </Progress.Root>
          <Group>
            <RingProgress size={90} thickness={8} sections={[{ value: 65, color: "blue" }]} />
          </Group>
        </Stack>
      </Section>

      <Section title="Skeleton">
        <Stack maw={360} gap="xs">
          <Skeleton height={16} width="70%" radius="sm" />
          <Skeleton height={16} radius="sm" />
          <Skeleton height={80} radius="md" />
        </Stack>
      </Section>

      <Section title="Notification">
        <Stack maw={360} gap="sm">
          <Notification title="New notification" color="green" icon={<IconCheck size={16} />}>
            3 new emails in Gmail.
          </Notification>
          <Notification title="Connection lost" color="red" withCloseButton={false}>
            Discord connector will retry automatically.
          </Notification>
        </Stack>
      </Section>
    </Page>
  );
}

export const Feedback: Story = {
  render: () => <FeedbackPage />,
};
