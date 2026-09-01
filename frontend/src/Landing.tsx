import { Center, Stack, Text, Title } from "@mantine/core";
import { authClient } from "./AuthHelpers/auth-client";
import { Login } from "./Login";
import { Logout } from "./Logout";
import icon from "./assets/bones-icon.svg";

export function Landing() {
  const { data: session, isPending } = authClient.useSession();

  return (
    <Center mih="100vh" bg="white" p="md">
      <Stack align="center" gap="xl" maw={380} w="100%">
        <Stack align="center" gap="xs">
          <img src={icon} alt="" width={120} style={{ maxWidth: "100%", height: "auto" }} />
          <Title order={2} c="black">Bones</Title>
        </Stack>
        <Stack align="center" gap="lg" w="100%">
          <Text c="dimmed" size="sm" ta="center">
            All your notifications, in one place.
          </Text>
          {!isPending && (session ? <Logout /> : <Login />)}
        </Stack>
      </Stack>
    </Center>
  );
}