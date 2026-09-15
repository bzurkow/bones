// A thin re-export, not a translating wrapper like Button -- Tooltip needs
// no prop mapping of its own (unlike Button's variant names), its Bones
// look comes entirely from theme.ts's Tooltip.extend. This exists so every
// consumer imports Tooltip from "shared-ui" (one canonical path, same
// "component dev work lives in shared-ui" default the rest of this package
// follows) instead of reaching into "@mantine/core" directly for it.
export { Tooltip } from "@mantine/core";
export type { TooltipProps } from "@mantine/core";
