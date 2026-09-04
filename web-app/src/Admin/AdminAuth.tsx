import styles from "./AdminPanel.module.css";

export function AdminAuth() {
  return (
    <p className={styles.body}>
      Social providers, SSO connections, and session policy will live here.
    </p>
  );
}
