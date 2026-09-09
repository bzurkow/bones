import styles from "./AdminPanel.module.css";

// Placeholder -- see bones-roadmap-notes.md item 14 ("some sort of user
// grouping"), relates to item 8 (invitations) and item 3 (per-feature
// roles) once those are designed too.
export function AdminOrganizations() {
  return (
    <p className={styles.body}>
      Organizations, their members, and who belongs to which will live here.
    </p>
  );
}
