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
// Visibility is a per-user setting (ApplicationSettings.tsx's "Show view
// mode toggle" switch), not the site-wide admin control originally
// sketched in bones-roadmap-notes.md item 19 -- there's no
// AdminSiteSettings backing yet to hang that on, and per-user is a more
// direct fit for "I don't want to see this button" anyway.
export function ColorSchemeToggle() {
  const { data: session, refetch } = authClient.useSession();
  const computed = useComputedColorScheme("light");
  const isDark = computed === "dark";

  if (!session || !session.user.showViewModeToggle) return null;

  async function handleToggle() {
    await trpc.userSettings.updateUserSettings.mutate({
      inheritViewModeFromBrowser: false,
      viewMode: isDark ? "light" : "dark",
    });
    await refetch();
  }

  return <ColorSchemeToggleButton isDark={isDark} onToggle={() => void handleToggle()} />;
}
