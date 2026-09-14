// Narrow adapter for cfg.provider/cfg.extraEntries: exposes ONLY
// MantineProvider on window.Bones, not @mantine/core's whole surface.
// Whole-package inclusion was tried first and silently lost Bones' own
// Table (a real component name Mantine also exports) -- ES module "star
// export" semantics drop a name entirely, with no build warning, when two
// `export *` sources both provide it and neither is the main package's own
// namespace. This file is the fix: it's the only Mantine name design-sync
// ever merges onto the global, so it can never collide with a Bones name.
export { MantineProvider } from "@mantine/core";
