import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import styles from "./MarkdownViewer.module.css";

export interface MarkdownViewerProps {
  content: string;
}

// Renders real markdown -- headings, lists, tables, task lists, strikethrough
// (remark-gfm, matching GitHub's own flavor) -- as actual formatted HTML,
// not raw source in a monospace block. Used both for the read-only "view"
// state and, doubling as it does, the "Preview" tab of MarkdownEditor.
export function MarkdownViewer({ content }: MarkdownViewerProps) {
  return (
    <div className={styles.prose}>
      <Markdown remarkPlugins={[remarkGfm]}>{content}</Markdown>
    </div>
  );
}
