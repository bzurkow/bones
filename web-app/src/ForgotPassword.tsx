import { useState } from "react";
import { Link } from "react-router-dom";
import { authClient } from "./AuthHelpers/auth-client";
import { ColorSchemeToggle } from "./ColorSchemeToggle";
import { AuthForm, AuthNotice, AuthPageShell, AuthSwitchLink, Button, TextField } from "./components";

// Public, unauthenticated -- same tier as Login/SignUp (App.tsx). No
// useAuthProtocols gate the way Login/SignUp have for email vs. Google:
// this page only ever deals with a password, so it's irrelevant whether
// Google sign-in is enabled, and it stays reachable even with email sign-up
// off (an existing email/password account can still need a reset).
export function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  // Better Auth's own requestPasswordReset always returns { status: true }
  // whether or not the address has an account (anti-enumeration -- see
  // node_modules/better-auth/dist/api/routes/password.mjs), so there's no
  // "not found" branch to handle here; a real request error (network, rate
  // limit) is the only failure mode this catches.
  const [sent, setSent] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    try {
      // redirectTo, not callbackURL -- requestPasswordReset's own param
      // name (see auth.ts's sendResetPassword comment for the full
      // link-construction chain). Lands on /reset-password with a real
      // ?token=... once the emailed link is clicked and validated.
      await authClient.requestPasswordReset({
        email,
        redirectTo: `${window.location.origin}/reset-password`,
      });
      setSent(true);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <ColorSchemeToggle />
      <AuthPageShell linkComponent={Link} linkProps={{ to: "/" }} heading="Reset your password">
        {sent ? (
          <AuthNotice>If an account exists for {email}, check it for a link to reset your password.</AuthNotice>
        ) : (
          <>
            <AuthNotice>Enter the email address on your account and we'll send you a reset link.</AuthNotice>
            <AuthForm onSubmit={(event) => void handleSubmit(event)}>
              <TextField
                label="Email"
                type="email"
                name="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.currentTarget.value)}
              />
              <Button type="submit" fullWidth disabled={submitting}>
                {submitting ? "Sending…" : "Send reset link"}
              </Button>
            </AuthForm>
          </>
        )}

        <AuthSwitchLink linkComponent={Link} linkProps={{ to: "/login" }}>
          Back to sign in
        </AuthSwitchLink>
      </AuthPageShell>
    </>
  );
}
