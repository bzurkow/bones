// TS-level ambient declaration matching Vite's own built-in one (vite/client)
// for the same imports in ui/src/components/BonesMark/BonesMark.tsx --
// Next.js doesn't ship an equivalent, so this app needs its own copy for
// `import mark from "*.svg"` to type-check. Next's webpack config resolves
// the actual import at build time (its default asset/resource rule).
declare module "*.svg" {
  const src: string;
  export default src;
}
