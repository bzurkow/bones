import type { Meta, StoryObj } from "@storybook/react-vite";
import { Anchor, Code, List, Stack, Text, Title } from "@mantine/core";

const meta = { title: "Introduction/Overview" } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

function OverviewPage() {
  return (
    <Stack gap="xl" maw={760}>
      <Stack gap={4}>
        <Title order={1}>Platypus UI toolkit</Title>
        <Text c="dimmed">
          Everything in this Storybook lives in <Code>packages/react-ui</Code> — the one React app both{" "}
          <Code>apps/web</Code> and <Code>apps/tauri</Code> mount, so anything you see here renders identically in
          the browser and the desktop shell.
        </Text>
      </Stack>

      <Stack gap={4}>
        <Title order={2}>Design system</Title>
        <Text>
          Built on{" "}
          <Anchor href="https://mantine.dev" target="_blank" rel="noreferrer">
            Mantine
          </Anchor>{" "}
          with a custom theme (<Code>src/theme.ts</Code>) rather than Mantine&apos;s defaults:
        </Text>
        <List>
          <List.Item>
            Four brand accents — <Code>blue</Code>, <Code>green</Code>, <Code>purple</Code>, <Code>pink</Code> —
            each a Mantine <Code>virtualColor</Code> backed by a generated 10-stop ramp, pinned at an exact OKLCH
            value from the original design handoff. See <Code>Foundations/Colors</Code>.
          </List.Item>
          <List.Item>
            Six neutral tokens (background / surface / surfaceAlt / border / text / textMuted), applied via a
            custom <Code>cssVariablesResolver</Code>, independent per light/dark scheme. See{" "}
            <Code>Foundations/Colors</Code>.
          </List.Item>
          <List.Item>
            <Code>@tabler/icons-react</Code> for icons in general; the Google sign-in button is the one deliberate
            exception (Google&apos;s brand guidelines require their exact mark, so it&apos;s hand-inlined instead).
          </List.Item>
        </List>
      </Stack>

      <Stack gap={4}>
        <Title order={2}>Auth flow</Title>
        <List>
          <List.Item>
            <Code>Login.tsx</Code> / <Code>Logout.tsx</Code> are separate components, each self-contained via its
            own <Code>authClient.useSession()</Code> call; <Code>Landing.tsx</Code> picks between them.
          </List.Item>
          <List.Item>
            <Code>App.tsx</Code>&apos;s <Code>AuthGate</Code> wraps every route once — no session and not already
            on <Code>/login</Code> redirects there. New routes get this for free, no per-route wiring.
          </List.Item>
          <List.Item>
            The login card force-pins <Code>{`<MantineProvider forceColorScheme="light">`}</Code> around itself,
            independent of the OS/app color scheme — see <Code>Auth/Landing</Code>.
          </List.Item>
          <List.Item>
            Desktop sign-in (<Code>AuthHelpers/desktop-auth.ts</Code>) opens the system browser rather than
            navigating the embedded webview, and hands the session back via a <Code>platypus://</Code> deep link —
            only works from a real bundled <Code>.app</Code> (<Code>tauri build --debug</Code>), not{" "}
            <Code>tauri dev</Code>&apos;s raw debug binary.
          </List.Item>
        </List>
      </Stack>

      <Stack gap={4}>
        <Title order={2}>File layout</Title>
        <List>
          <List.Item>
            <Code>src/AuthHelpers/</Code> — auth client, desktop OAuth flow, in-memory desktop token.
          </List.Item>
          <List.Item>
            <Code>src/HealthChecks/</Code> — dev-only backend/DB connectivity probes.
          </List.Item>
          <List.Item>
            <Code>config.ts</Code>, <Code>assets/</Code>, <Code>vite-env.d.ts</Code> live at the package root, not
            under <Code>src/</Code> — they&apos;re tooling/config and static files, not application source.
          </List.Item>
        </List>
      </Stack>

      <Stack gap={4}>
        <Title order={2}>Running this Storybook</Title>
        <Text>
          <Code>yarn workspace react-ui storybook</Code>. The Auth stories (<Code>Login</Code> / <Code>Logout</Code>
          ) make real requests against <Code>VITE_BACKEND_URL</Code> (defaults to <Code>localhost:3000</Code>) — run{" "}
          <Code>yarn backend:dev</Code> alongside it to exercise them for real, same as the app&apos;s own dev-only
          health checks.
        </Text>
      </Stack>
    </Stack>
  );
}

export const Overview: Story = {
  render: () => <OverviewPage />,
};
