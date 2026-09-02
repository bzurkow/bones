# Bones — build rules

Read this before writing any UI. `COMPONENTS.md` has the per-component specs;
`brand/tokens.css` has the raw values; `bones-style-guide.html` renders all of it.

## The one-line version

Black and white, borders not shadows, mono for machine values, gaps not margins.

## Hard rules

1. **Grayscale, plus one exception.** `#0A0A0A #3A3A3A #6E6E6E #8A8A8A #A8A8A8 #C8C8C8 #E4E4E4 #EDEDED #F2F2F2 #FAFAFA #FFFFFF`,
   plus `--bones-danger` (`#B42318` light / `#F97066` dark) for error text and
   borders only. No success, warning, or other accent color — don't add another
   one. Error states use a 2px `--bones-danger` border and a mono message in
   `--bones-danger`; status uses a filled dot.
2. **Two fonts.** Instrument Sans (400/500/600) for anything a human wrote.
   JetBrains Mono (400/500) for anything a machine produced — paths, hashes,
   regions, timestamps, counts, IDs, status words, eyebrows.
3. **Borders, not shadows.** Cards, inputs, and rows are separated by 1px rules.
   The only shadows in the system: the hero preview frame
   (`0 24px 60px -30px rgba(10,10,10,0.28)`), the prompt bar
   (`0 1px 2px rgba(10,10,10,0.05)`), and the input focus ring
   (`0 0 0 3px rgba(10,10,10,0.07)`).
4. **Rule weight carries hierarchy.** A rule that opens a section is `1px solid #0A0A0A`.
   Every other rule is `1px solid #E4E4E4` (or `#F2F2F2` for dense sub-lists).
5. **Layout with flex/grid + `gap`.** Never space siblings with margins or
   whitespace. Card grids that share rules use `gap:1px` over a `#E4E4E4`
   background, not per-cell borders.
6. **`box-sizing: border-box`** on anything full-width with padding and a border.
7. **Negative tracking scales with size.** `-0.045em` display, `-0.04em` h2,
   `-0.025em` subhead, `-0.02em` card title, `0` at body size.
8. **No third-party brand logos.** "Continue with Google" is text. Keeps the page
   monochrome and sidesteps logo-usage terms.
9. **Focus is always visible.** Ink border + 3px 7% ring. Never `outline: none`
   without a replacement.

## Naming

Use the token names from `tokens.css` (`--bones-ink`, `--bones-muted`,
`--bones-border`, `--bones-surface`). If you find yourself needing a value that
is not in that file, it does not exist yet — add it to `tokens.css` and to the
style guide page in the same change, or pick the nearest existing one.

## Layout constants

| Thing | Value |
| --- | --- |
| Container | `max-width: 1180px; padding: 0 32px` |
| Marketing section gap | `128px` |
| App section gap | `56–64px` |
| Header | `66px` marketing, `62px` app, sticky, `rgba(255,255,255,0.88–0.9)` + `backdrop-filter: blur(12px)` |
| Radii | `8` chips/small buttons · `9` buttons/inputs · `14` cards/panels · `16` hero frame · `999` pills/avatars |

## Responsive

Breakpoints are not part of the system yet — the pages are built at desktop width
with `clamp()` type. When you implement, collapse in this order:

- `1024px` — two-column sections stack; 3-up grids become 2-up.
- `768px` — grids become 1-up; login side panel is hidden (not stacked);
  header nav collapses to the mark plus a menu button; prompt bar stacks its
  button full-width below the field.
- Keep the 32px gutter down to `480px`, then 20px.

## Writing copy

Plain and confident. Short declaratives, no exclamation, no "unleash" or
"supercharge". Numbers are specific or absent. The product's claim is ownership —
say what the user gets, not how they will feel.
