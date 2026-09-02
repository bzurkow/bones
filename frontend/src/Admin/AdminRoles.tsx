import styles from "./AdminPanel.module.css";

// Placeholder for the feature-table x role join-table work (none/read/write
// per feature) -- deliberately deferred, see the roadmap notes.
export function AdminRoles() {
  return (
    <p className={styles.body}>
      Per-feature access -- none, read, write -- mapped to each role will live here.
    </p>
  );
}
