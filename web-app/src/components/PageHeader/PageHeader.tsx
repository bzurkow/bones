import type { ReactNode } from "react";
import { Eyebrow } from "shared-ui";
import styles from "./PageHeader.module.css";

// The app-page shell every authenticated page uses: eyebrow + h1 up top,
// then whatever the page renders below, inside the standard page-level
// max-width/padding/gap. Extracted once Admin and Settings had grown
// byte-identical copies of it.
export interface PageHeaderProps {
  eyebrow: ReactNode;
  title: ReactNode;
  children: ReactNode;
}

export function PageHeader({ eyebrow, title, children }: PageHeaderProps) {
  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <Eyebrow>{eyebrow}</Eyebrow>
        <h1 className={styles.title}>{title}</h1>
      </div>
      {children}
    </div>
  );
}
