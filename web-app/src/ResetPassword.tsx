import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { authClient } from "./AuthHelpers/auth-client";
import { isStrongPassword, PASSWORD_RULES_MESSAGE } from "./AuthHelpers/password-rules";
import { BrandLockup, Button, ErrorMessage, TextField } from "./components";
import styles from "./ResetPassword.module.css";

// Public, unauthenticated, same tier as Login/SignUp/ForgotPassword
// (App.tsx). Landed on directly from the emailed reset link -- Better
// Auth's own GET /reset-password/:token (backend, not this page) validates
// the token first and only ever redirects here with a real ?token=...; an
// expired/already-used one gets ?error=INVALID_TOKEN instead and never a
// token at all (see ForgotPassword.tsx's requestPasswordReset comment for
// the full link chain, and Login.tsx's own linkErrorCode for the same
// ?error=CODE convention on the email-verification link).
export function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");
  const linkError = searchParams.get("error");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!token) return;
    setFormError(null);
    setPasswordError(null);
    setConfirmError(null);

    if (!isStrongPassword(newPassword)) {
      setPasswordError(PASSWORD_RULES_MESSAGE);
      return;
    }
    if (newPassword !== confirmPassword) {
      setConfirmError("Passwords don't match.");
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await authClient.resetPassword({ newPassword, token });
      if (error) {
        setFormError(error.message ?? "Couldn't reset your password.");
        return;
      }
      // No session gets created here (resetPassword only changes the
      // password, doesn't sign in) -- back to Login to sign in with it.
      navigate("/login", { replace: true });
    } finally {
      setSubmitting(false);
    }
  }

  // Invalid/expired/missing token -- nothing to submit against, show the
  // "request a new one" path instead of a form that can only ever fail.
  const tokenInvalid = !token || linkError !== null;

  return (
    <div className={styles.page}>
      <Link to="/" className={styles.brand}>
        <BrandLockup />
      </Link>

      <div className={styles.center}>
        <div className={styles.card}>
          <h1 className={styles.heading}>Choose a new password</h1>

          {tokenInvalid ? (
            <>
              <p className={styles.body}>That reset link expired or was already used.</p>
              <Link to="/forgot-password" className={styles.switchLink}>
                Request a new one
              </Link>
            </>
          ) : (
            <>
              <form className={styles.form} onSubmit={(event) => void handleSubmit(event)}>
                <TextField
                  label="New password"
                  type="password"
                  name="newPassword"
                  autoComplete="new-password"
                  required
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.currentTarget.value)}
                  error={passwordError}
                  helperText={passwordError ? undefined : PASSWORD_RULES_MESSAGE}
                />
                <TextField
                  label="Confirm new password"
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
                  {submitting ? "Saving…" : "Save new password"}
                </Button>
              </form>

              <Link to="/login" className={styles.switchLink}>
                Back to sign in
              </Link>
            </>
          )}
        </div>
      </div>

      <div className={styles.footer}>
        <span>© 2026 Bones</span>
      </div>
    </div>
  );
}
