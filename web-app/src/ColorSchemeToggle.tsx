import { useComputedColorScheme } from "@mantine/core";
import { ColorSchemeToggleButton } from "shared-ui";
import { authClient } from "./AuthHelpers/auth-client";
import { trpc } from "./trpc";

// Floating bottom-right light/dark toggle for signed-in users. Goes
// through the same path Settings' switches use (updateUserSettings +
// refetch) rather than a local-only Mantine override, so it stays
// consistent with what hooks/useColorScheme.ts actually reads off the
// session -- a local override here would just get clobbered on the next
// render. Turns off "inherit from browser" on click, same as picking an
// explicit mode in Settings would.
//
// TODO: a site setting to show/hide this (see AdminSiteSettings.tsx) is
// on the roadmap -- see bones-roadmap-notes.md item 19. Not built yet;
// this always renders for now.
export function ColorSchemeToggle() {
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

  return <ColorSchemeToggleButton isDark={isDark} onToggle={() => void handleToggle()} />;
}
