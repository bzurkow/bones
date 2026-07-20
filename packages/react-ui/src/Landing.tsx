import { Center, MantineProvider, Paper, Stack, Text, Title } from "@mantine/core";
import { authClient } from "./AuthHelpers/auth-client";
import { Login } from "./Login";
import { Logout } from "./Logout";
import icon from "../assets/platypus-icon.svg";

export function Landing() {
  const { data: session, isPending } = authClient.useSession();

  return (
    <Center mih="100vh" bg="blue" p="md">
      <MantineProvider forceColorScheme="light">
        <Paper withBorder shadow="sm" radius="lg" p="xl" maw={380} w="100%" bg="white">
          <Stack align="center" gap="xl">
            <Stack align="center" gap="xs">
              <img src={icon} alt="" width={120} style={{ maxWidth: "100%", height: "auto" }} />
              <Title order={2} c="black">Platypus</Title>
            </Stack>
            <Stack align="center" gap="lg" w="100%">
              <Text c="dimmed" size="sm" ta="center">
                All your notifications, in one place.
              </Text>
              {!isPending && (session ? <Logout /> : <Login />)}
            </Stack>
          </Stack>
        </Paper>
      </MantineProvider>
    </Center>
  );
}