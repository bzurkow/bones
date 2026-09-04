import styles from "./AdminPanel.module.css";

// Placeholder: real data is `users` (backend/src/db/auth-schema.ts) --
// listing/inviting/role changes land once the per-feature permissions work
// (join table of role -> feature -> none/read/write) is designed.
export function AdminUsers() {
  return (
    <p className={styles.body}>
      Every account, with role and status. Invite, suspend, and role changes will live here.
    </p>
  );
}
