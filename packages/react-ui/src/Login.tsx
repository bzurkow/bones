import { authClient } from "./auth-client";

export function Login() {
  const { data: session, isPending } = authClient.useSession();

  async function handleSignIn() {
    await authClient.signIn.social({
      provider: "google",
      callbackURL: window.location.origin,
    });
  }

  async function handleSignOut() {
    await authClient.signOut();
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
