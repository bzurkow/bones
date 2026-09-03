import { ActionIcon, useComputedColorScheme } from "@mantine/core";
import { IconMoon, IconSun } from "@tabler/icons-react";
import { authClient } from "./AuthHelpers/auth-client";
import { trpc } from "./trpc";

// Temporary dev-only tool: flip light/dark while building views against
// both, without needing browser devtools or an OS-level toggle. Goes
// through the same path Settings' switches use (updateUserSettings +
// refetch) rather than a local-only Mantine override, so it stays
// consistent with what hooks/useColorScheme.ts actually reads off the
// session -- a local override here would just get clobbered on the next
// render. Turns off "inherit from browser" on click, same as picking an
// explicit mode in Settings would. Remove once there's enough real UI to
// eyeball both modes without it.
export function DevColorSchemeToggle() {
  const { data: session, refetch } = authClient.useSession();
  const computed = useComputedColorScheme("light");
  const isDark = computed === "dark";

  if (!session) return null;

  async function handleToggle() {
    await trpc.userSettings.updateUserSettings.mutate({
      inheritViewModeFromBrowser: false,
      viewMode: isDark ? "light" : "dark",
    });
    await refetch();
  }

  return (
    <ActionIcon
      variant="default"
      size="lg"
      radius="xl"
      onClick={() => void handleToggle()}
      aria-label="Toggle color scheme (dev only)"
      style={{ position: "fixed", right: 20, bottom: 20, zIndex: 1000 }}
    >
      {isDark ? <IconSun size={18} /> : <IconMoon size={18} />}
    </ActionIcon>
  );
}
