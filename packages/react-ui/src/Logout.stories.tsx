import type { Meta, StoryObj } from "@storybook/react-vite";
import { Logout } from "./Logout";

const meta = {
  title: "Auth/Logout",
  component: Logout,
  parameters: {
    docs: {
      description: {
        component:
          "Renders nothing until authClient.useSession() resolves with a real session — sign in via the app " +
          "(or the Login story) against the local backend first to see this render for real.",
      },
    },
  },
} satisfies Meta<typeof Logout>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
