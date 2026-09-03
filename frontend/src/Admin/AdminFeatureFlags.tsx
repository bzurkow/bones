import styles from "./AdminPanel.module.css";

// Placeholder -- distinct from AdminRBAC.tsx's per-role access levels:
// this is about turning whole features on/off (rollout, kill switch),
// not who can see a feature that's already on.
export function AdminFeatureFlags() {
  return (
    <p className={styles.body}>
      Feature flags -- ship behind a toggle, roll out gradually, or switch off
      instantly -- will live here.
    </p>
  );
}
