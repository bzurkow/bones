import styles from "./CodePanel.module.css";

// COMPONENTS.md: "No syntax highlighting -- color is not available to carry
// it." Always the opposite of the page's current scheme (see tokens.css's
// --bones-code-*), so it reads as a distinct "screen" against the page
// rather than blending into a same-toned surface.
export interface CodePanelProps {
  filename: string;
  code: string;
}

export function CodePanel({ filename, code }: CodePanelProps) {
  return (
    <div className={styles.panel}>
      <div className={styles.filename}>{filename}</div>
      <pre className={styles.code}>{code}</pre>
    </div>
  );
}
