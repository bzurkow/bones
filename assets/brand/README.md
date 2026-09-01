# Bones — brand assets

Black and white only. The mark is a page skeleton: three stacked bars with knuckled
ends. Read one way it is a wireframe, read the other it is a bone.

## Files

| File | Use |
| --- | --- |
| `bones-mark.svg` | The mark alone, black. Nav at 24px, favicon, avatars. |
| `bones-mark-inverse.svg` | The mark alone, white — for dark surfaces. |
| `bones-lockup.svg` | Horizontal mark + wordmark. Default logo. |
| `bones-lockup-inverse.svg` | Horizontal lockup, white. |
| `bones-lockup-stacked.svg` | Centered stacked lockup — square placements. |
| `bones-app-icon-black.svg` | White mark on a black rounded square. |
| `bones-app-icon-white.svg` | Black mark on a white rounded square. |
| `bones-mark-{32,512,1024}.png` | Raster mark, transparent background. |
| `bones-app-icon-{512,1024}.png` | Raster app icon (store / PWA). |

The wordmark SVGs use live `<text>` set in Instrument Sans 600 at -0.04em tracking.
Convert text to outlines before handing the logo to anyone outside the team, or
embed the font — otherwise it falls back to Helvetica.

## Rules

- Clear space on all sides = the height of one bar knuckle (≈ 22% of the mark height).
- Minimum size: 16px for the mark, 96px wide for the horizontal lockup.
- Only `#0A0A0A` on light, or `#FFFFFF` on dark. Never tinted, never gradient,
  never outlined.
- Do not rotate, restack, or change the bar lengths — the ragged right edge is the
  wireframe read.

## Palette

`#0A0A0A` ink · `#6E6E6E` muted · `#8A8A8A` subtle · `#E4E4E4` border ·
`#FAFAFA` surface · `#FFFFFF` background. No accent color.

## Type

- **Instrument Sans** — 400 body, 500 nav, 600 headings. Google Fonts.
- **JetBrains Mono** — 400/500, for eyebrows, metadata, file trees, and code.

```html
<link href="https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
```

Tokens are in `frontend/src/tokens.css` (the copy that actually ships — imported in `frontend/src/main.tsx`, not duplicated here).
