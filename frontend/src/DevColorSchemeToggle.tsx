import { ActionIcon, useComputedColorScheme, useMantineColorScheme } from "@mantine/core";
import { IconMoon, IconSun } from "@tabler/icons-react";

// Temporary dev-only tool: flip light/dark while building views against
// both, without needing browser devtools or an OS-level toggle. Remove once
// there's enough real UI that eyeballing both modes this way isn't needed.
export function DevColorSchemeToggle() {
  const { setColorScheme } = useMantineColorScheme();
  const computed = useComputedColorScheme("light");
  const isDark = computed === "dark";

  return (
    <ActionIcon
      variant="default"
      size="lg"
      radius="xl"
      onClick={() => setColorScheme(isDark ? "light" : "dark")}
      aria-label="Toggle color scheme (dev only)"
      style={{ position: "fixed", right: 20, bottom: 20, zIndex: 1000 }}
    >
      {isDark ? <IconSun size={18} /> : <IconMoon size={18} />}
    </ActionIcon>
  );
}
