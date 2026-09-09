import styles from "./AdminPanel.module.css";

export function AdminSiteSettings() {
  return (
    <p className={styles.body}>
      Site-wide configuration -- name, branding, feature flags, whether the
      color scheme toggle is shown -- will live here.
    </p>
  );
}
