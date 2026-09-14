import { MarkdownViewer } from "shared-ui";

const DOC = `## Terms and conditions

Last updated **March 2026**. This is a summary; the full text governs.

- Accounts are personal and may not be shared.
- Usage data is retained for 90 days, then aggregated.
- ~~Free tier includes 10 projects~~ Free tier includes 3 projects.

### Rollout checklist

- [x] Draft reviewed by legal
- [ ] Published to all regions

| Plan | Projects | Price |
| --- | --- | --- |
| Free | 3 | $0 |
| Pro | Unlimited | $20/mo |

See \`docs/legal/terms.md\` for the complete text, or contact support.
`;

// Full-width prose render: headings, a bulleted list, strikethrough, a
// task list, and a table -- the actual GFM surface this component
// supports, from a realistic terms-and-conditions excerpt.
export function Default() {
  return <MarkdownViewer content={DOC} />;
}

// A single short paragraph -- the common case for inline help text.
export function ShortText() {
  return <MarkdownViewer content="Passwords must be at least 12 characters and include a number." />;
}
