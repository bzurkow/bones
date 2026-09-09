import type { ViewMode } from "backend";
import { authClient } from "../AuthHelpers/auth-client";

// Drives Mantine's color scheme from the signed-in user's own settings
// (ColorSchemeToggle writes to the same settings, so both stay in sync
// through the session rather than a separate local override). Returns the value
// MantineProvider's forceColorScheme prop should get -- an explicit
// "light"/"dark" to pin it, or undefined to let MantineProvider fall back
// to its own defaultColorScheme="auto" (OS prefers-color-scheme, also what
// applies while logged out or still loading).
//
// A pure derivation, not a useEffect calling setColorScheme: Mantine
// recreates that function's identity every time the resolved scheme
// changes (its own useCallback depends on that value), so putting it in an
// effect's dependency array feeds back into itself. forceColorScheme is
// Mantine's own mechanism for exactly this ("something external controls
// the scheme"), and nothing here writes back into what it reads.
export function useColorScheme(): ViewMode | undefined {
  const { data: session } = authClient.useSession();
  if (!session || session.user.inheritViewModeFromBrowser) return undefined;
  return session.user.viewMode;
}
