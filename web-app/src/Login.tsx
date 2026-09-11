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
    setSubmitting(true);
    try {
      const { error: signInError } = await authClient.signIn.email({ email, password });
      if (signInError) {
        setError(signInError.message ?? "Couldn't sign in with that email and password.");
        return;
      }
      await refetch();
      navigate(redirectTarget(), { replace: true });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={styles.page}>
      <Link to="/" className={styles.brand}>
        <BrandLockup />
      </Link>

      <div className={styles.center}>
        <div className={styles.card}>
          <h1 className={styles.heading}>Sign in to Bones</h1>

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
