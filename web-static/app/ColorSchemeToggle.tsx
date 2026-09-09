"use client";

import { useComputedColorScheme, useMantineColorScheme } from "@mantine/core";
import { ColorSchemeToggleButton } from "shared-ui";

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

  return <ColorSchemeToggleButton isDark={isDark} onToggle={() => setColorScheme(isDark ? "light" : "dark")} />;
}
