import type { Meta, StoryObj } from "@storybook/react-vite";
import { IconDots, IconLogout2, IconSettings, IconTrash } from "@tabler/icons-react";
import { useDisclosure } from "@mantine/hooks";
import {
  ActionIcon,
  Button,
  Drawer,
  Group,
  HoverCard,
  Menu,
  Modal,
  Popover,
  Text,
  Tooltip,
} from "@mantine/core";
import { Page, Section } from "./Section";

const meta = { title: "Components/Overlays" } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

function ModalDemo() {
  const [opened, { open, close }] = useDisclosure(false);
  return (
    <>
      <Button onClick={open}>Open modal</Button>
      <Modal opened={opened} onClose={close} title="Sign out?">
        <Text size="sm">You&apos;ll need to sign in again to see your notifications.</Text>
      </Modal>
    </>
  );
}

function DrawerDemo() {
  const [opened, { open, close }] = useDisclosure(false);
  return (
    <>
      <Button variant="default" onClick={open}>
        Open drawer
      </Button>
      <Drawer opened={opened} onClose={close} title="Settings">
        <Text size="sm">Connected sources, notification preferences, etc.</Text>
      </Drawer>
    </>
  );
}

function OverlaysPage() {
  return (
    <Page title="Overlays">
      <Section title="Modal / Drawer">
        <Group gap="sm">
          <ModalDemo />
          <DrawerDemo />
        </Group>
      </Section>

      <Section title="Popover">
        <Popover width={240} position="bottom" withArrow shadow="md">
          <Popover.Target>
            <Button variant="light">Toggle popover</Button>
          </Popover.Target>
          <Popover.Dropdown>
            <Text size="sm">Anchors to its target and stays inside the viewport automatically.</Text>
          </Popover.Dropdown>
        </Popover>
      </Section>

      <Section title="Tooltip">
        <Group gap="sm">
          <Tooltip label="Mark all as read">
            <ActionIcon variant="default" aria-label="Mark all as read">
              <IconDots size={16} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Opens instantly" openDelay={0} closeDelay={0}>
            <Button variant="default">No delay</Button>
          </Tooltip>
        </Group>
      </Section>

      <Section title="HoverCard">
        <HoverCard width={260} shadow="md" withArrow>
          <HoverCard.Target>
            <Text size="sm" style={{ cursor: "pointer", textDecoration: "underline dotted" }}>
              Hover for details
            </Text>
          </HoverCard.Target>
          <HoverCard.Dropdown>
            <Text size="sm">Shows extra context without a click — good for previews.</Text>
          </HoverCard.Dropdown>
        </HoverCard>
      </Section>

      <Section title="Menu">
        <Menu shadow="md" width={200}>
          <Menu.Target>
            <ActionIcon variant="default" aria-label="More actions">
              <IconDots size={16} />
            </ActionIcon>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Label>Account</Menu.Label>
            <Menu.Item leftSection={<IconSettings size={14} />}>Settings</Menu.Item>
            <Menu.Item leftSection={<IconLogout2 size={14} />}>Log out</Menu.Item>
            <Menu.Divider />
            <Menu.Item color="red" leftSection={<IconTrash size={14} />}>
              Delete account
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
      </Section>
    </Page>
  );
}

export const Overlays: Story = {
  render: () => <OverlaysPage />,
};
