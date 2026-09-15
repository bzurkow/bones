import styles from "./ErrorMessage.module.css";

// CLAUDE.md rule 1: error states are a 2px --bones-danger border and a mono
// message -- one place for that treatment so every error state matches it
// automatically instead of being hand-copied per page. Renders nothing for
// a null/empty message so call sites don't need their own conditional.
export interface ErrorMessageProps {
  message: string | null | undefined;
}

export function ErrorMessage({ message }: ErrorMessageProps) {
  if (!message) return null;
  return <p className={styles.error}>{message}</p>;
}
