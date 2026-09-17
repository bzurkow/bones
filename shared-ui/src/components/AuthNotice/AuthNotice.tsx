import type { ReactNode } from "react";
import styles from "./AuthNotice.module.css";

// Covers what web-app's four auth pages called two different class names
// for the exact same rule (margin:0, muted color) -- ForgotPassword/
// ResetPassword's ".body" (an explanatory line before the form) and every
// page's ".notice" (a status line replacing the form, e.g. "check your
// email"). One component either way; the distinction was never real.
export interface AuthNoticeProps {
  children: ReactNode;
}

export function AuthNotice({ children }: AuthNoticeProps) {
  return <p className={styles.notice}>{children}</p>;
}
