import type { ReactNode } from "react";
import styles from "./RowCard.module.css";

// A bordered card whose rows share a hairline divider -- the settings-row
// pattern (label + optional description on the left, a control or value on
// the right). Extracted once Settings and Profile both wanted it.
export function RowCard({ children }: { children: ReactNode }) {
  return <div className={styles.card}>{children}</div>;
}

export interface RowProps {
  label: ReactNode;
  description?: ReactNode;
  children: ReactNode;
}

export function Row({ label, description, children }: RowProps) {
  return (
    <div className={styles.row}>
      <div className={styles.rowText}>
        <span className={styles.rowLabel}>{label}</span>
        {description && <span className={styles.rowDescription}>{description}</span>}
      </div>
      {children}
    </div>
  );
}
