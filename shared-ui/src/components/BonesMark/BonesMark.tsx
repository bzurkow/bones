import { useComputedColorScheme } from "@mantine/core";
import mark from "../../assets/brand/bones-mark.svg";
import markInverse from "../../assets/brand/bones-mark-inverse.svg";

// Swaps to the white mark on dark surfaces -- brand/README.md: "Only
// #0A0A0A on light, or #FFFFFF on dark." The black mark is invisible
// against a dark background otherwise.
export interface BonesMarkProps {
  size?: number;
}

// This component is shared across two bundlers with different *.svg
// import behavior: Vite (web-app) resolves it to a plain URL string --
// matching the `const src: string` ambient declaration both apps' svg.d.ts
// files use -- but Next's Turbopack (web-static, both `dev` and `build`)
// resolves it to a `{ src, width, height }` "structured image object"
// instead, for next/image's benefit. Passing that object straight to
// `<img src>` renders `src="[object Object]"`. Normalize to a string here
// rather than trusting the ambient type, which only holds for one of the
// two bundlers.
function assetUrl(asset: unknown): string {
  return typeof asset === "string" ? asset : (asset as { src: string }).src;
}

export function BonesMark({ size = 24 }: BonesMarkProps) {
  const isDark = useComputedColorScheme("light") === "dark";
  return <img src={assetUrl(isDark ? markInverse : mark)} alt="" width={size} height={size} />;
}
