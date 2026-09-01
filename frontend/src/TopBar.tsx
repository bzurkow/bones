import { Avatar, Group, Menu, Text } from "@mantine/core";
import { IconLogout2 } from "@tabler/icons-react";
import { Link } from "react-router-dom";
import { authClient } from "./AuthHelpers/auth-client";
import { BonesMark } from "./components";

const TOPBAR_HEIGHT = 56;

export function TopBar() {
  const { data: session, refetch } = authClient.useSession();

  async function handleSignOut() {
    await authClient.signOut();
    await refetch();
  }

  return (
    <Group
      justify="space-between"
      align="center"
      h={TOPBAR_HEIGHT}
      px="md"
      style={{
        background: "var(--mantine-color-body)",
        borderBottom: "1px solid var(--mantine-color-default-border)",
      }}
    >
      <Link to="/" style={{ textDecoration: "none", color: "inherit" }}>
        <Group gap="sm">
          <BonesMark size={TOPBAR_HEIGHT} />
          <Text fw={700} size="lg">
            Bones
          </Text>
        </Group>
      </Link>

      <Menu shadow="md" width={200} position="bottom-end">
        <Menu.Target>
          <Avatar
            src={session?.user.image ?? undefined}
            alt={session?.user.name ?? "Account"}
            radius="xl"
            size="sm"
            style={{ cursor: "pointer" }}
          />
        </Menu.Target>
        <Menu.Dropdown>
          <Menu.Item leftSection={<IconLogout2 size={16} />} onClick={handleSignOut}>
            Log Out
          </Menu.Item>
        </Menu.Dropdown>
      </Menu>
    </Group>
  );
}
