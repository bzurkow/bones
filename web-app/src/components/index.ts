// Bones component library -- built against COMPONENTS.md's specs as pages
// need them, not all speculatively up front. Add the rest (Chip, TextField,
// standalone Card, etc.) in their own folders here as the pages that need
// them get built.
//
// Button/BonesMark/Eyebrow/CardGrid/CodePanel moved to the shared
// "shared-ui" package once the marketing site (a separate Next.js app)
// needed them too -- re-exported here so every existing `from
// "./components"` import in this app keeps working unchanged.
export * from "shared-ui";
export * from "./ConfusedIcon";
export * from "./PageHeader";
export * from "./ErrorMessage";
export * from "./RowCard";
