import { Button } from "@mantine/core";
import type React from "react";
import { useLocation } from "react-router-dom";
import type { Location } from "react-router-dom";
import { authClient } from "./AuthHelpers/auth-client";
// Google's own "G" logo asset (unmodified), from their Sign in with Google
// branding guidelines/assets package -- developers.google.com/identity/branding-guidelines.
// Google only publishes a bare (no button chrome) version of this as a PNG,
// not SVG, so this stays a raster asset rather than the SVG the rest of the
// app's icons use.
import googleLogo from "./assets/google-g-logo.png";

export function Login() {
  const { refetch } = authClient.useSession();
  const location = useLocation();
  const from = (location.state as { from?: Location } | null)?.from;

  async function handleSignIn() {
    const target = from ? `${from.pathname}${from.search}` : "/";
    await authClient.signIn.social({
      provider: "google",
      callbackURL: `${window.location.origin}${target}`,
    });
    await refetch();
  }

  return (
    <Button
      color="green"
      size="md"
      fullWidth
      leftSection={<img src={googleLogo} alt="" width={18} height={18} />}
      onClick={handleSignIn}
      style={{ "--button-hover": "var(--mantine-color-green-4)" } as React.CSSProperties}
    >
      Continue with Google
    </Button>
  );
}
