import "@mantine/core/styles.css";
import type { Preview } from "@storybook/react-vite";
import { MantineProvider } from "@mantine/core";
import { theme, cssVariablesResolver } from "../src/theme";

const preview: Preview = {
  parameters: {
    layout: "fullscreen",
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
  globalTypes: {
    colorScheme: {
      description: "Color scheme",
      toolbar: {
        title: "Color scheme",
        icon: "circlehollow",
        items: [
          { value: "light", icon: "sun", title: "Light" },
          { value: "dark", icon: "moon", title: "Dark" },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: {
    colorScheme: "light",
  },
  decorators: [
    (Story, context) => (
      <MantineProvider
        theme={theme}
        cssVariablesResolver={cssVariablesResolver}
        forceColorScheme={context.globals.colorScheme === "dark" ? "dark" : "light"}
      >
        <div
          style={{
            minHeight: "100vh",
            padding: "1.5rem",
            background: "var(--mantine-color-body)",
            color: "var(--mantine-color-text)",
          }}
        >
          <Story />
        </div>
      </MantineProvider>
    ),
  ],
};

export default preview;
