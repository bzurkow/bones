import { Avatar, Menu } from "@mantine/core";
import { IconLogout2, IconSettings, IconShieldLock, IconUser } from "@tabler/icons-react";
import { Link } from "react-router-dom";
import { authClient } from "./AuthHelpers/auth-client";
import { isAdmin } from "./AuthHelpers/roles";
import { BonesMark } from "./components";
import styles from "./TopBar.module.css";

// COMPONENTS.md's Header, app variant (62px, gap 26px, avatar as the
// rightmost item -- vs. web-static's 66px/28px/CTA button, see Landing.tsx's
// own header). Menu/Avatar stay Mantine components (real dropdown/focus
// behavior); the container/height/background/border match our tokens
// instead of Mantine's own body/border variables.
export function TopBar() {
  const { data: session, refetch } = authClient.useSession();

  async function handleSignOut() {
    await authClient.signOut();
    await refetch();
  }

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link to="/" className={styles.brand}>
          <BonesMark size={22} />
          <span className={styles.wordmark}>Bones</span>
        </Link>

        <Menu width={200} position="bottom-end">
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
            <Menu.Item component={Link} to="/profile" leftSection={<IconUser size={16} />}>
              Profile
            </Menu.Item>
            <Menu.Item component={Link} to="/settings" leftSection={<IconSettings size={16} />}>
              Settings
            </Menu.Item>
            {isAdmin(session?.user) && (
              <>
                <Menu.Divider />
                <Menu.Item component={Link} to="/admin" leftSection={<IconShieldLock size={16} />}>
                  Admin
                </Menu.Item>
              </>
            )}
            <Menu.Divider />
            <Menu.Item leftSection={<IconLogout2 size={16} />} onClick={handleSignOut}>
              Log Out
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
      </div>
    </header>
  );
}
