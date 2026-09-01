import { useComputedColorScheme } from "@mantine/core";
import mark from "../../assets/brand/bones-mark.svg";
import markInverse from "../../assets/brand/bones-mark-inverse.svg";

// Swaps to the white mark on dark surfaces -- brand/README.md: "Only
// #0A0A0A on light, or #FFFFFF on dark." The black mark is invisible
// against a dark background otherwise.
export interface BonesMarkProps {
  size?: number;
}

export function BonesMark({ size = 24 }: BonesMarkProps) {
  const isDark = useComputedColorScheme("light") === "dark";
  return <img src={isDark ? markInverse : mark} alt="" width={size} height={size} />;
}
