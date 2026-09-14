import { useState } from "react";
import { Link } from "react-router-dom";
import { authClient } from "./AuthHelpers/auth-client";
import { BrandLockup, Button, TextField } from "./components";
import styles from "./ForgotPassword.module.css";

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
    <div className={styles.page}>
      <Link to="/" className={styles.brand}>
        <BrandLockup />
      </Link>

      <div className={styles.center}>
        <div className={styles.card}>
          <h1 className={styles.heading}>Reset your password</h1>

          {sent ? (
            <p className={styles.notice}>
              If an account exists for {email}, check it for a link to reset your password.
            </p>
          ) : (
            <>
              <p className={styles.body}>Enter the email address on your account and we'll send you a reset link.</p>
              <form className={styles.form} onSubmit={(event) => void handleSubmit(event)}>
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
              </form>
            </>
          )}

          <Link to="/login" className={styles.switchLink}>
            Back to sign in
          </Link>
        </div>
      </div>

      <div className={styles.footer}>
        <span>© 2026 Bones</span>
      </div>
    </div>
  );
}
