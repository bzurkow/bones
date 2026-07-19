import { authClient } from "./auth-client";
import { isTauri, signInWithDesktopFlow } from "./desktop-auth";
import { setDesktopToken } from "./desktop-token";

export function Login() {
  const { data: session, isPending, refetch } = authClient.useSession();

  async function handleSignIn() {
    if (isTauri()) {
      await signInWithDesktopFlow();
    } else {
      await authClient.signIn.social({
        provider: "google",
        callbackURL: window.location.origin,
      });
    }
    await refetch();
  }

  async function handleSignOut() {
    await authClient.signOut();
    setDesktopToken(undefined);
    await refetch();
  }

  if (isPending) {
    return null;
  }

  if (session) {
    return (
      <div>
        <p>user {session.user.email} logged in</p>
        <button onClick={handleSignOut}>Log out</button>
      </div>
    );
  }

  return <button onClick={handleSignIn}>Log in</button>;
}
