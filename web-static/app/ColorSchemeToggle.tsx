"use client";

import { ActionIcon, useComputedColorScheme, useMantineColorScheme } from "@mantine/core";
import { IconMoon, IconSun } from "@tabler/icons-react";

// Same floating bottom-right toggle as web-app's ColorSchemeToggle, but
// without its auth/session plumbing -- this site has no signed-in user to
// persist a preference against. Uses Mantine's own useMantineColorScheme()
// directly, which persists to localStorage under the same
// "mantine-color-scheme-value" key layout.tsx's ColorSchemeScript already
// reads before first paint, so a visitor's choice survives a reload even
// though the site defaults to light for everyone else.
export function ColorSchemeToggle() {
  const { setColorScheme } = useMantineColorScheme();
  const computed = useComputedColorScheme("light");
  const isDark = computed === "dark";

  return (
    <ActionIcon
      variant="default"
      size="lg"
      radius="xl"
      onClick={() => setColorScheme(isDark ? "light" : "dark")}
      aria-label="Toggle color scheme"
      style={{ position: "fixed", right: 20, bottom: 20, zIndex: 1000 }}
    >
      {isDark ? <IconSun size={18} /> : <IconMoon size={18} />}
    </ActionIcon>
  );
}
