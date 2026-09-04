import styles from "./AdminPanel.module.css";

// Placeholder for the feature-table x role join-table work (none/read/write
// per feature) -- deliberately deferred, see the roadmap notes.
export function AdminRBAC() {
  return (
    <p className={styles.body}>
      Each feature, with per-role access -- none, read, write -- will live here.
    </p>
  );
}
