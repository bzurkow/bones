import type { Meta, StoryObj } from "@storybook/react-vite";
import { Landing } from "./Landing";

const meta = {
  title: "Auth/Landing (full page)",
  component: Landing,
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "The actual root/login page — force-pins MantineProvider forceColorScheme=\"light\" around the card " +
          "so it stays light regardless of the app or OS color scheme, and switches between Login/Logout based " +
          "on session state.",
      },
    },
  },
} satisfies Meta<typeof Landing>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
