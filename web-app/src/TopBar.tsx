import { Avatar, Menu } from "@mantine/core";
import { IconLogout2, IconSettings, IconShieldLock, IconUser } from "@tabler/icons-react";
import { Link, useNavigate } from "react-router-dom";
import { authClient } from "./AuthHelpers/auth-client";
import { hasFeature } from "./AuthHelpers/permissions";
import { BrandLockup } from "./components";
import styles from "./TopBar.module.css";

// COMPONENTS.md's Header, app variant (62px, gap 26px, avatar as the
// rightmost item -- vs. web-static's 66px/28px/CTA button, see Landing.tsx's
// own header). Menu/Avatar stay Mantine components (real dropdown/focus
// behavior); the container/height/background/border match our tokens
// instead of Mantine's own body/border variables.
export function TopBar() {
  const { data: session, refetch } = authClient.useSession();
  const navigate = useNavigate();

  async function handleSignOut() {
    await authClient.signOut();
    // Explicit navigation, not left to RequireAuth's own reactive redirect
    // -- that redirect passes state: { from: location }, where location is
    // still whatever page you were on when you clicked Log Out (e.g.
    // /profile), so signing back in would send you right back there. A
    // deliberate logout isn't "trying to reach a page" the way an
    // unauthenticated visit is, so there's nothing to return to -- always
    // land on /login with no `from`.
    navigate("/login", { replace: true });
    // refetch() *after* navigate(), not before -- authClient.useSession()
    // is one shared store across the whole app (better-auth/dist/client),
    // so calling it here updates what every mounted useSession() consumer
    // sees, not just this component's own. Awaiting it before navigate()
    // (the previous order) let RequireAuth -- still mounted on whatever
    // page you signed out from -- see session flip to null while it could
    // still fire its *own* competing redirect (the exact one this comment
    // used to describe, with `from` set to that old page), racing this
    // function's own navigate() for the same history entry. Moving it
    // after means RequireAuth for that page has already unmounted by the
    // time this fires -- no race left to lose, by construction, not
    // timing luck. (signOut() alone does eventually broadcast a session
    // invalidation on its own, but via an internal ~10ms setTimeout in
    // better-auth's client -- relying on that instead of an explicit,
    // awaited refetch() would just trade one accident-of-timing fix for
    // another.)
    await refetch();
  }

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link to="/" className={styles.brand}>
          <BrandLockup size="sm" />
        </Link>

        <Menu width={200} position="bottom-end">
          <Menu.Target>
            <Avatar
              src={session?.user.avatarUrl ?? session?.user.image ?? undefined}
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
            {hasFeature(session?.enabledFeatures, "page.admin.view") && (
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
