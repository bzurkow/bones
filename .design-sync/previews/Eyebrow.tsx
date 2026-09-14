import { Eyebrow } from "shared-ui";

// Plain eyebrow: mono, uppercase, sits above a section heading.
export function Default() {
  return <Eyebrow>Design system</Eyebrow>;
}

// Hero-only pill variant: same type, wrapped in a bordered pill with an
// ink dot.
export function Pill() {
  return <Eyebrow pill>Now in beta</Eyebrow>;
}
