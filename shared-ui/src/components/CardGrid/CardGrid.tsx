import type { ReactNode } from "react";
import styles from "./CardGrid.module.css";

// COMPONENTS.md's "Card" hairline grid: cells share 1px rules via a
// background-color gap trick instead of per-cell borders.
export interface CardGridItem {
  index: string;
  title: ReactNode;
  description: ReactNode;
}

export interface CardGridProps {
  items: CardGridItem[];
  columns?: number;
}

export function CardGrid({ items, columns = 3 }: CardGridProps) {
  return (
    <div className={styles.grid} style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
      {items.map((item) => (
        <div className={styles.cell} key={item.index}>
          <div className={styles.index}>{item.index}</div>
          <h3 className={styles.title}>{item.title}</h3>
          <p className={styles.description}>{item.description}</p>
        </div>
      ))}
    </div>
  );
}
