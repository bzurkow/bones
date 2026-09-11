import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import type { Location } from "react-router-dom";
import { authClient } from "./AuthHelpers/auth-client";
import { isStrongPassword, PASSWORD_RULES_MESSAGE } from "./AuthHelpers/password-rules";
import { BrandLockup, Button, ErrorMessage, TextField } from "./components";
import { useAuthProtocols } from "./hooks/useAuthProtocols";
import styles from "./SignUp.module.css";

export function SignUp() {
  const { refetch } = authClient.useSession();
  const location = useLocation();
  const navigate = useNavigate();
  const from = (location.state as { from?: Location } | null)?.from;
  const protocols = useAuthProtocols();
  // Email/password is the only sign-up method this page has UI for --
  // Google sign-in (Login.tsx) creates an account on first use too, so
  // there's no separate "sign up with Google" flow to gate here.
  const emailEnabled = protocols?.email ?? false;

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
      const { error } = await authClient.signUp.email({ name, email, password });
      if (error) {
        setFormError(error.message ?? "Couldn't create that account.");
        return;
      }
      await refetch();
      navigate(from ? `${from.pathname}${from.search}` : "/", { replace: true });
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
          <h1 className={styles.heading}>Create your account</h1>

          {emailEnabled ? (
            <form className={styles.form} onSubmit={(event) => void handleSubmit(event)}>
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
            </form>
          ) : (
            protocols && <ErrorMessage message="Email sign-up is currently disabled." />
          )}

          <Link to="/login" className={styles.switchLink}>
            Already have an account? Sign in
          </Link>
        </div>
      </div>

      <div className={styles.footer}>
        <span>© 2026 Bones</span>
      </div>
    </div>
  );
}
