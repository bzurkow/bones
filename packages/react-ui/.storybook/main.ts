import type { StorybookConfig } from "@storybook/react-vite";

const config: StorybookConfig = {
  stories: ["../src/**/*.mdx", "../src/**/*.stories.@(ts|tsx)"],
  addons: [],
  framework: {
    name: "@storybook/react-vite",
    options: {},
  },
  env: (config) => ({
    ...config,
    VITE_BACKEND_URL: process.env.VITE_BACKEND_URL ?? "http://localhost:3000",
  }),
};

export default config;
