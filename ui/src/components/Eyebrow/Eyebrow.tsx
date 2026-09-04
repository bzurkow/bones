import type { ReactNode } from "react";
import styles from "./Eyebrow.module.css";

// COMPONENTS.md: mono, uppercase, 0.14em tracking, sits above a section
// heading. `pill` is the hero-only variant: same type at 11.5px/0.06em,
// wrapped in a bordered pill with a 6px ink dot.
export interface EyebrowProps {
  children: ReactNode;
  pill?: boolean;
}

export function Eyebrow({ children, pill }: EyebrowProps) {
  if (pill) {
    return (
      <div className={styles.pill}>
        <span className={styles.dot} />
        {children}
      </div>
    );
  }
  return <div className={styles.eyebrow}>{children}</div>;
}
