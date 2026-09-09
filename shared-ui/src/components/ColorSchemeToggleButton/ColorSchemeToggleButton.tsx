import { ActionIcon } from "@mantine/core";
import { IconMoon, IconSun } from "@tabler/icons-react";

export interface ColorSchemeToggleButtonProps {
  isDark: boolean;
  onToggle: () => void;
}

// The floating bottom-right light/dark toggle, presentational only --
// web-app and web-static each had their own byte-for-byte identical copy
// of this shell, differing only in how a click actually persists the
// change (web-app: updateUserSettings + session refetch; web-static: no
// signed-in user to persist against, so Mantine's own
// useMantineColorScheme() directly, localStorage-backed). That state
// wiring stays local to each app's own ColorSchemeToggle.tsx; this is
// just the button.
export function ColorSchemeToggleButton({ isDark, onToggle }: ColorSchemeToggleButtonProps) {
  return (
    <ActionIcon
      variant="default"
      size="lg"
      radius="xl"
      onClick={onToggle}
      aria-label="Toggle color scheme"
      style={{ position: "fixed", right: 20, bottom: 20, zIndex: 1000 }}
    >
      {isDark ? <IconSun size={18} /> : <IconMoon size={18} />}
    </ActionIcon>
  );
}
