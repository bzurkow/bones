import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // "shared-ui" ships raw TS/CSS source (no build step of its own -- see
  // shared-ui/package.json) -- this tells Next's bundler to transpile it
  // directly, same as Vite already does for it natively.
  transpilePackages: ["shared-ui"],
  // Note: `images.disableStaticImages` (Next's documented way to make
  // `import x from "*.svg"` return a plain URL string instead of a
  // `{ src, width, height }` object) does NOT fix this under Turbopack --
  // that doc predates Turbopack being the default bundler (both `next dev`
  // and `next build` use it here), and the object shape still comes
  // through regardless of the flag. See BonesMark.tsx in shared-ui for the
  // actual fix (normalizing both shapes at the point of use).
};

export default nextConfig;
