import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import type { Location } from "react-router-dom";
import { authClient } from "./AuthHelpers/auth-client";
import { BrandLockup, Button, ErrorMessage, TextField } from "./components";
import { useAuthProtocols } from "./hooks/useAuthProtocols";
import styles from "./Login.module.css";

export function Login() {
  const { refetch } = authClient.useSession();
  const location = useLocation();
  const navigate = useNavigate();
  const from = (location.state as { from?: Location } | null)?.from;
  const protocols = useAuthProtocols();
  const emailEnabled = protocols?.email ?? false;
  const googleEnabled = protocols?.google ?? false;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Set when sign-in fails specifically because the account's email isn't
  // verified yet -- auth.ts's hooks throw this before checking the
  // password, and (sendOnSignIn: true) already fired a fresh verification
  // email at that point, so this just needs to say so and offer a manual
  // resend for when that one gets lost too.
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
  const [resent, setResent] = useState(false);
  // A stale/already-used verification link lands here via RequireAuth's
  // redirect: better-auth's own GET /verify-email appends ?error=CODE to
  // callbackURL and redirects the browser there on failure (expired token,
  // token already consumed, ...) instead of ever creating a session --
  // RequireAuth then bounces the still-unauthenticated visit to /login,
  // carrying that query string along in `from`. Derived straight from
  // `from`, not its own state -- there's nothing to clear it back to.
  const linkErrorCode = from?.search ? new URLSearchParams(from.search).get("error") : null;
  const linkErrorMessage = linkErrorCode
    ? linkErrorCode === "TOKEN_EXPIRED"
      ? "That verification link expired. Sign in below to get a new one."
      : "That verification link didn't work. Sign in below to get a new one."
    : null;

  function redirectTarget() {
    return from ? `${from.pathname}${from.search}` : "/";
  }

  async function handleGoogleSignIn() {
    await authClient.signIn.social({
      provider: "google",
      callbackURL: `${window.location.origin}${redirectTarget()}`,
    });
    await refetch();
  }

  async function handleCredentialSignIn(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setUnverifiedEmail(null);
    setResent(false);
    setSubmitting(true);
    try {
      const { error: signInError } = await authClient.signIn.email({ email, password });
      if (signInError) {
        if (signInError.code === "EMAIL_NOT_VERIFIED") {
          setUnverifiedEmail(email);
        } else {
          setError(signInError.message ?? "Couldn't sign in with that email and password.");
        }
        return;
      }
      await refetch();
      navigate(redirectTarget(), { replace: true });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResendVerification() {
    if (!unverifiedEmail) return;
    await authClient.sendVerificationEmail({ email: unverifiedEmail, callbackURL: `${window.location.origin}/` });
    setResent(true);
  }

  return (
    <div className={styles.page}>
      <Link to="/" className={styles.brand}>
        <BrandLockup />
      </Link>

      <div className={styles.center}>
        <div className={styles.card}>
          <h1 className={styles.heading}>Sign in to Bones</h1>

          <ErrorMessage message={linkErrorMessage} />

          {/* Both start undefined while useAuthProtocols is still loading,
              so neither method renders for that first beat -- see that
              hook's own comment for why that's preferred over guessing. */}
          {emailEnabled && (
            <form className={styles.form} onSubmit={(event) => void handleCredentialSignIn(event)}>
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
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => setPassword(event.currentTarget.value)}
              />
              <ErrorMessage message={error} />
              {unverifiedEmail &&
                (resent ? (
                  <p className={styles.notice}>Check {unverifiedEmail} for a new link.</p>
                ) : (
                  <p className={styles.notice}>
                    Verify your email first.{" "}
                    <button type="button" className={styles.linkButton} onClick={() => void handleResendVerification()}>
                      Resend the link
                    </button>
                  </p>
                ))}
              <Button type="submit" fullWidth disabled={submitting}>
                {submitting ? "Signing in…" : "Sign in"}
              </Button>
            </form>
          )}

          {emailEnabled && googleEnabled && (
            <div className={styles.divider}>
              <span className={styles.dividerLine} />
              <span>OR</span>
              <span className={styles.dividerLine} />
            </div>
          )}

          {googleEnabled && (
            // Text only, no logo -- CLAUDE.md rule 8: "No third-party brand
            // logos. 'Continue with Google' is text. Keeps the page
            // monochrome and sidesteps logo-usage terms."
            <Button variant="quiet" fullWidth onClick={() => void handleGoogleSignIn()}>
              Continue with Google
            </Button>
          )}

          {protocols && !emailEnabled && !googleEnabled && (
            // The admin-panel guard (authProtocols.setEnabled) shouldn't
            // ever let this happen -- at least one method always stays
            // enabled -- but render something coherent instead of a blank
            // card if it somehow does.
            <ErrorMessage message="Sign-in is currently unavailable." />
          )}

          <Link to="/signup" className={styles.switchLink}>
            Don't have an account? Create one
          </Link>
        </div>
      </div>

      <div className={styles.footer}>
        <span>© 2026 Bones</span>
      </div>
    </div>
  );
}
