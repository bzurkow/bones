// Shared by any component here that does `import x from "*.svg"` and needs
// a plain URL string out of it. Vite (web-app) resolves that import to a
// plain string -- matching the `const src: string` ambient declaration
// both apps' svg.d.ts files use -- but Next's Turbopack (web-static, both
// `dev` and `build`) resolves it to a `{ src, width, height }` "structured
// image object" instead, for next/image's benefit. Passing that object
// straight to `<img src>` renders `src="[object Object]"`. Normalize here
// rather than trusting the ambient type, which only holds for one of the
// two bundlers. (`images.disableStaticImages` is Next's documented fix for
// this, but doesn't apply under Turbopack -- see web-static/next.config.ts.)
export function assetUrl(asset: unknown): string {
  return typeof asset === "string" ? asset : (asset as { src: string }).src;
}
