import type { Meta, StoryObj } from "@storybook/react-vite";
import { IconBell, IconMail, IconSettings } from "@tabler/icons-react";
import { Anchor, Breadcrumbs, NavLink, Pagination, Stack, Stepper, Tabs, Text } from "@mantine/core";
import { Page, Section } from "./Section";

const meta = { title: "Components/Navigation" } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

function NavigationPage() {
  return (
    <Page title="Navigation">
      <Section title="Tabs">
        <Tabs defaultValue="all" maw={480}>
          <Tabs.List>
            <Tabs.Tab value="all">All</Tabs.Tab>
            <Tabs.Tab value="unread">Unread</Tabs.Tab>
            <Tabs.Tab value="snoozed">Snoozed</Tabs.Tab>
          </Tabs.List>
          <Tabs.Panel value="all" pt="sm">
            <Text size="sm">Every notification across connected sources.</Text>
          </Tabs.Panel>
          <Tabs.Panel value="unread" pt="sm">
            <Text size="sm">Only what you haven&apos;t seen yet.</Text>
          </Tabs.Panel>
          <Tabs.Panel value="snoozed" pt="sm">
            <Text size="sm">Come back to these later.</Text>
          </Tabs.Panel>
        </Tabs>
      </Section>

      <Section title="Breadcrumbs">
        <Breadcrumbs>
          {["Settings", "Connected sources", "Gmail"].map((item) => (
            <Anchor key={item} size="sm">
              {item}
            </Anchor>
          ))}
        </Breadcrumbs>
      </Section>

      <Section title="Pagination">
        <Pagination total={8} defaultValue={3} />
      </Section>

      <Section title="NavLink">
        <Stack gap={4} maw={260}>
          <NavLink label="Notifications" leftSection={<IconBell size={16} />} active />
          <NavLink label="Sources" leftSection={<IconMail size={16} />} />
          <NavLink label="Settings" leftSection={<IconSettings size={16} />} />
        </Stack>
      </Section>

      <Section title="Stepper">
        <Stepper active={1} maw={480}>
          <Stepper.Step label="Sign in" description="Google SSO" />
          <Stepper.Step label="Connect sources" description="Gmail, Slack, Discord" />
          <Stepper.Step label="Done" description="Start receiving notifications" />
        </Stepper>
      </Section>

      <Section title="Anchor">
        <Anchor href="https://mantine.dev" target="_blank" rel="noreferrer">
          mantine.dev
        </Anchor>
      </Section>
    </Page>
  );
}

export const Navigation: Story = {
  render: () => <NavigationPage />,
};
