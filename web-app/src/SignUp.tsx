import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import type { Location } from "react-router-dom";
import { authClient } from "./AuthHelpers/auth-client";
import { isStrongPassword, PASSWORD_RULES_MESSAGE } from "./AuthHelpers/password-rules";
import { ColorSchemeToggle } from "./ColorSchemeToggle";
import {
  AuthDivider,
  AuthForm,
  AuthNotice,
  AuthPageShell,
  AuthSwitchLink,
  Button,
  ErrorMessage,
  TextField,
} from "./components";
import { useAuthProtocols } from "./hooks/useAuthProtocols";

export function SignUp() {
  const { refetch } = authClient.useSession();
  const location = useLocation();
  const navigate = useNavigate();
  const from = (location.state as { from?: Location } | null)?.from;
  const protocols = useAuthProtocols();
  const emailEnabled = protocols?.email ?? false;
  const googleEnabled = protocols?.google ?? false;

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  // Only set once the user has actually tried to submit with a weak/mismatched
  // password -- checked client-side first so a bad password never round-trips
  // to the server at all, but the hint under the field (below) is always
  // visible regardless of this.
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  // Set once sign-up succeeds but returns no session -- auth.ts's
  // requireEmailVerification: true means /sign-up/email creates the user
  // and sends a verification email, but doesn't sign them in yet (Better
  // Auth returns { token: null, user } in that case). Shown instead of
  // navigating away, since there's no session to navigate an authenticated
  // page with.
  const [verificationPending, setVerificationPending] = useState(false);

  // Shared by both sign-up paths (credential + Google) -- same helper
  // Login.tsx already has, for the same reason: where to land once the
  // account actually exists (wherever `from` was headed, or "/").
  function redirectTarget() {
    return from ? `${from.pathname}${from.search}` : "/";
  }

  // Google is a sign-in *and* sign-up flow in one -- authClient.signIn.social
  // creates the account on first use, same as Login.tsx's own
  // handleGoogleSignIn (identical body; kept as two copies rather than a
  // shared helper since each page's own redirectTarget/refetch closures
  // differ, same duplication precedent as Login/SignUp's other near-
  // identical page chrome).
  async function handleGoogleSignUp() {
    await authClient.signIn.social({
      provider: "google",
      callbackURL: `${window.location.origin}${redirectTarget()}`,
    });
    await refetch();
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);
    setPasswordError(null);
    setConfirmError(null);

    if (!isStrongPassword(password)) {
      setPasswordError(PASSWORD_RULES_MESSAGE);
      return;
    }
    if (password !== confirmPassword) {
      setConfirmError("Passwords don't match.");
      return;
    }

    setSubmitting(true);
    try {
      // callbackURL: where the verification link (clicked later, from the
      // email) lands the browser after auth.ts's autoSignInAfterVerification
      // sets the session -- this app's own origin, not the backend's.
      const { data, error } = await authClient.signUp.email({
        name,
        email,
        password,
        callbackURL: `${window.location.origin}/`,
      });
      if (error) {
        setFormError(error.message ?? "Couldn't create that account.");
        return;
      }
      if (!data.token) {
        setVerificationPending(true);
        return;
      }
      await refetch();
      navigate(redirectTarget(), { replace: true });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <ColorSchemeToggle />
      <AuthPageShell linkComponent={Link} linkProps={{ to: "/" }} heading="Create your account">
        {verificationPending ? (
          <AuthNotice>Check {email} for a link to verify your account.</AuthNotice>
        ) : emailEnabled ? (
          <AuthForm onSubmit={(event) => void handleSubmit(event)}>
            <TextField
              label="Name"
              type="text"
              name="name"
              autoComplete="name"
              required
              value={name}
              onChange={(event) => setName(event.currentTarget.value)}
            />
            <TextField
              label="Email"
              type="email"
              name="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.currentTarget.value)}
            />
            <TextField
              label="Password"
              type="password"
              name="password"
              autoComplete="new-password"
              required
              value={password}
              onChange={(event) => setPassword(event.currentTarget.value)}
              error={passwordError}
              helperText={passwordError ? undefined : PASSWORD_RULES_MESSAGE}
            />
            <TextField
              label="Confirm password"
              type="password"
              name="confirmPassword"
              autoComplete="new-password"
              required
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.currentTarget.value)}
              error={confirmError}
            />
            <ErrorMessage message={formError} />
            <Button type="submit" fullWidth disabled={submitting}>
              {submitting ? "Creating account…" : "Create account"}
            </Button>
          </AuthForm>
        ) : null}

        {/* Independent of the email form's own state above -- same
            structure as Login.tsx, so Google stays offered even while
            email-specific states (disabled, submitting) apply. Hidden
            once verificationPending, though: there's already a pending
            account at that point, so offering another sign-up method
            reads as confusing clutter, not a real alternative. */}
        {!verificationPending && emailEnabled && googleEnabled && <AuthDivider />}

        {!verificationPending && googleEnabled && (
          // Text only, no logo -- CLAUDE.md rule 8: "No third-party brand
          // logos. 'Continue with Google' is text. Keeps the page
          // monochrome and sidesteps logo-usage terms."
          <Button variant="quiet" fullWidth onClick={() => void handleGoogleSignUp()}>
            Continue with Google
          </Button>
        )}

        {protocols && !emailEnabled && !googleEnabled && (
          // Same reasoning as Login.tsx's own guard shouldn't ever let
          // this happen (auth-protocols.setEnabled refuses to disable
          // the last remaining method) -- render something coherent
          // instead of a blank card if it somehow does.
          <ErrorMessage message="Sign-up is currently unavailable." />
        )}

        <AuthSwitchLink linkComponent={Link} linkProps={{ to: "/login" }}>
          Already have an account? Sign in
        </AuthSwitchLink>
      </AuthPageShell>
    </>
  );
}
