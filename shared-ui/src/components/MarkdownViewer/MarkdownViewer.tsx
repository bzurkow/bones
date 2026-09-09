import Markdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import remarkGfm from "remark-gfm";
import styles from "./MarkdownViewer.module.css";

// react-markdown doesn't render embedded raw HTML by default (a security
// default -- unrecognized markdown+HTML mixing is otherwise just shown as
// literal text) -- rehype-raw actually parses it. Content sources like
// Common Paper's own CSA export lean on raw <span class="..."> for
// semantic markup (variable highlighting, section ids) remark alone can't
// express. rehype-sanitize runs after it and strips anything actually
// dangerous (script tags, event-handler attributes, javascript: URLs) --
// this content is admin-authored (see trpc/routers/terms-and-conditions.ts's
// adminProcedure-gated `update`) but rendered by termsAndConditions.get, a
// *public* procedure, so a compromised or careless admin account
// shouldn't be able to plant stored XSS for every visitor. The default
// schema already allows <span>, but strips `class` (GitHub's own default,
// to block CSS-based attacks generally) -- extended here to allow it
// specifically on <span>, since that's exactly what this content needs
// and nothing broader.
const schema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    span: [...(defaultSchema.attributes?.span ?? []), "className"],
  },
};

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
      <Markdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw, [rehypeSanitize, schema]]}>
        {content}
      </Markdown>
    </div>
  );
}
