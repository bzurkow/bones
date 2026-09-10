import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import type { Location } from "react-router-dom";
import { authClient } from "./AuthHelpers/auth-client";
import { BrandLockup, Button, ErrorMessage, TextField } from "./components";
import styles from "./Login.module.css";

export function Login() {
  const { refetch } = authClient.useSession();
  const location = useLocation();
  const navigate = useNavigate();
  const from = (location.state as { from?: Location } | null)?.from;

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

          <div className={styles.divider}>
            <span className={styles.dividerLine} />
            <span>OR</span>
            <span className={styles.dividerLine} />
          </div>

          {/* Text only, no logo -- CLAUDE.md rule 8: "No third-party brand
              logos. 'Continue with Google' is text. Keeps the page
              monochrome and sidesteps logo-usage terms." */}
          <Button variant="quiet" fullWidth onClick={() => void handleGoogleSignIn()}>
            Continue with Google
          </Button>

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
