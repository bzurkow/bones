import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // "shared-ui" ships raw TS/CSS source (no build step of its own -- see
  // shared-ui/package.json) -- this tells Next's bundler to transpile it
  // directly, same as Vite already does for it natively.
  transpilePackages: ["shared-ui"],
};

export default nextConfig;
