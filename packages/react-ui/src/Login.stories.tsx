import type { Meta, StoryObj } from "@storybook/react-vite";
import { Login } from "./Login";

const meta = {
  title: "Auth/Login",
  component: Login,
  parameters: {
    docs: {
      description: {
        component:
          "Sign-in only — branches on isTauri() to either open the desktop system-browser flow or do a plain " +
          "Better Auth social redirect. Makes real requests against VITE_BACKEND_URL; run `yarn backend:dev` to " +
          "exercise the click for real, otherwise it just renders as a button.",
      },
    },
  },
} satisfies Meta<typeof Login>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
