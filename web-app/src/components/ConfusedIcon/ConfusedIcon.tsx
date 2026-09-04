import { useComputedColorScheme } from "@mantine/core";
import confused from "../../assets/brand/bones-confused.svg";
import confusedInverse from "../../assets/brand/bones-confused-inverse.svg";

// brand/README.md: "Confused skeleton -- empty states, 404s, failed
// generations." Same light/dark swap as BonesMark. Below 64px the source
// drops the teeth separators and question marks (use the "compact" asset
// instead, not built as its own component yet -- nothing needs it below
// 64px so far).
export interface ConfusedIconProps {
  size?: number;
}

export function ConfusedIcon({ size = 96 }: ConfusedIconProps) {
  const isDark = useComputedColorScheme("light") === "dark";
  return <img src={isDark ? confusedInverse : confused} alt="" width={size} height={size} />;
}
