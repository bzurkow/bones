import type { FormEvent, ReactNode } from "react";
import styles from "./AuthForm.module.css";

// Just the vertical-stack form wrapper every auth page's own form used
// identically -- gap:16px, nothing else. Kept this small (not folded into
// AuthPageShell itself) since ForgotPassword's "sent" state and SignUp's
// "verificationPending" state both replace the form with a notice instead
// of wrapping it, so the two need to compose independently.
export interface AuthFormProps {
  onSubmit: (event: FormEvent) => void;
  children: ReactNode;
}

export function AuthForm({ onSubmit, children }: AuthFormProps) {
  return (
    <form className={styles.form} onSubmit={onSubmit}>
      {children}
    </form>
  );
}
