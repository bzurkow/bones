import { authClient } from "../AuthHelpers/auth-client";
import { getViewSettings, type ViewMode } from "../AuthHelpers/viewSettings";

// Replaces DevColorSchemeToggle's manual button: the signed-in user's own
// settings now drive Mantine's color scheme instead. Returns the value
// MantineProvider's forceColorScheme prop should get -- an explicit
// "light"/"dark" to pin it, or undefined to let MantineProvider fall back
// to its own defaultColorScheme="auto" (OS prefers-color-scheme).
//
// Deliberately a pure derivation, not a useEffect calling setColorScheme:
// Mantine recreates setColorScheme's identity every time the resolved
// scheme changes (its own useCallback depends on that value), so putting
// it in an effect's dependency array feeds back into itself -- the effect
// fires, calls setColorScheme, which changes its own identity, which
// re-triggers the effect. forceColorScheme is Mantine's own mechanism for
// exactly this ("something external controls the scheme"), and nothing
// here writes back into what we read, so there's no loop to have.
export function useColorScheme(): ViewMode | undefined {
  const { data: session } = authClient.useSession();
  const { inheritViewModeFromBrowser, viewMode } = getViewSettings(session?.user);
  return inheritViewModeFromBrowser ? undefined : viewMode;
}
