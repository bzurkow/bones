import { useComputedColorScheme, useMantineColorScheme } from "@mantine/core";
import { ColorSchemeToggleButton } from "shared-ui";
import { authClient } from "./AuthHelpers/auth-client";
import { trpc } from "./trpc";

// Floating bottom-right light/dark toggle. Two distinct persistence paths,
// same as web-static's own ColorSchemeToggle.tsx documents for its one
// (logged-out-only) case:
//
// - Signed in: goes through the same path Settings' switches use
//   (updateUserSettings + refetch) rather than a local-only Mantine
//   override, so it stays consistent with what hooks/useColorScheme.ts
//   actually reads off the session -- a local override here would just get
//   clobbered on the next render. Turns off "inherit from browser" on
//   click, same as picking an explicit mode in Settings would. Visibility
//   is also a per-user setting here (ApplicationSettings.tsx's "Show view
//   mode toggle" switch) -- there's nothing to opt out of when logged out.
// - Signed out (Login/SignUp/ForgotPassword/ResetPassword/NotFound): no
//   account to persist a preference against, so it always shows and uses
//   Mantine's own useMantineColorScheme() directly instead --
//   localStorage-backed on its own, same as web-static's visitors get.
//   useColorScheme.ts's forceColorScheme is already undefined while
//   logged out, which is exactly what lets Mantine's own local state drive
//   the resolved scheme here in the first place.
export function ColorSchemeToggle() {
  const { data: session, refetch } = authClient.useSession();
  const { setColorScheme } = useMantineColorScheme();
  const computed = useComputedColorScheme("light");
  const isDark = computed === "dark";

  if (session && !session.user.showViewModeToggle) return null;

  async function handleToggle() {
    if (session) {
      await trpc.userSettings.updateUserSettings.mutate({
        inheritViewModeFromBrowser: false,
        viewMode: isDark ? "light" : "dark",
      });
      await refetch();
    } else {
      setColorScheme(isDark ? "light" : "dark");
    }
  }

  return <ColorSchemeToggleButton isDark={isDark} onToggle={() => void handleToggle()} />;
}
