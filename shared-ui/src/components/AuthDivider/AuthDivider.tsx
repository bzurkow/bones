import styles from "./AuthDivider.module.css";

// The "OR" rule between credential and social sign-in/sign-up, shared by
// Login and SignUp only (ForgotPassword/ResetPassword have no second
// method to divide from). No props -- both call sites used the exact same
// "OR" label.
export function AuthDivider() {
  return (
    <div className={styles.divider}>
      <span className={styles.dividerLine} />
      <span>OR</span>
      <span className={styles.dividerLine} />
    </div>
  );
}
