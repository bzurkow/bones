import { Tabs, Textarea } from "@mantine/core";
import { MarkdownViewer } from "../MarkdownViewer";
import styles from "./MarkdownEditor.module.css";

export interface MarkdownEditorProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  minRows?: number;
}

// GitHub-style Write/Preview tabs, not a WYSIWYG editor -- Write is a plain
// textarea for the raw markdown source, Preview renders that same value
// through MarkdownViewer, same as GitHub's own issue/PR editor.
export function MarkdownEditor({ label, value, onChange, minRows = 16 }: MarkdownEditorProps) {
  return (
    <div className={styles.wrapper}>
      {label && <span className={styles.label}>{label}</span>}
      <Tabs defaultValue="write" classNames={{ tab: styles.tab, list: styles.tabList }}>
        <Tabs.List>
          <Tabs.Tab value="write">Write</Tabs.Tab>
          <Tabs.Tab value="preview">Preview</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="write" pt="sm">
          <Textarea
            value={value}
            onChange={(event) => onChange(event.currentTarget.value)}
            autosize
            minRows={minRows}
            classNames={{ input: styles.input }}
          />
        </Tabs.Panel>

        <Tabs.Panel value="preview" pt="sm">
          <div className={styles.previewPanel}>
            {value.trim() ? (
              <MarkdownViewer content={value} />
            ) : (
              <p className={styles.empty}>Nothing to preview yet.</p>
            )}
          </div>
        </Tabs.Panel>
      </Tabs>
    </div>
  );
}
