import styles from "./AdminPanel.module.css";

// Placeholder -- combines what were two separate tabs (feature flags,
// RBAC) into one, but the two concepts underneath stay distinct: feature
// flags are whole-feature on/off (rollout, kill switch), RBAC is per-role
// access on a feature that's already on (none/read/write, the feature x
// role join-table work -- deliberately deferred, see the roadmap notes).
// Gap, not margin (CLAUDE.md rule 5), for the space between the two.
export function AdminPermissions() {
  return (
    <div className={styles.stack}>
      <p className={styles.body}>
        Feature flags -- ship behind a toggle, roll out gradually, or switch off instantly -- will
        live here.
      </p>
      <p className={styles.body}>Each feature, with per-role access -- none, read, write -- will live here.</p>
    </div>
  );
}
