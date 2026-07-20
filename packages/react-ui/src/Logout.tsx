import { Button, Stack, Text } from "@mantine/core";
import { authClient } from "./AuthHelpers/auth-client";
import { setDesktopToken } from "./AuthHelpers/desktop-token";

export function Logout() {
  const { data: session, isPending, refetch } = authClient.useSession();

  async function handleSignOut() {
    await authClient.signOut();
    setDesktopToken(undefined);
    await refetch();
  }

  if (isPending || !session) {
    return null;
  }

  return (
    <Stack align="center" gap="sm" w="100%">
      <Text size="sm" c="dimmed" ta="center">
        Signed in as {session.user.email}
      </Text>
      <Button variant="default" size="md" fullWidth onClick={handleSignOut}>
        Log out
      </Button>
    </Stack>
  );
}
