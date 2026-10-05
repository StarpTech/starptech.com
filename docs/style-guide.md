# Style guide

The visual language of starptech.com. Read this before touching styles,
adding a page, or drawing a diagram for a post. All styles live in
`src/styles/global.css`.

## The idea: a night shore

The site is dark, warm, and quiet, lit by one painting. Everything borrows
from it: deep ultramarine sky, gold surf, moonlit blue, a few stars. Accents
are faint; nothing competes with the writing. When in doubt, make it subtler.

- **Dark only.** There is no light mode and no theme toggle. Don't add
  `data-theme` rules or `prefers-color-scheme` branches.
- **Calm motion.** Slow, soft, and optional. Every animation has a
  `prefers-reduced-motion: reduce` fallback (static or off).
- **No boxes for the sake of boxes.** Prefer type, spacing, and hairlines.
  When a surface is needed, it's a soft panel (see below), never a dashed box.

## Tokens

Defined once on `:root`.

| Token | Value | Use |
| --- | --- | --- |
| `--bg` | `#161514` | page background (warm near-black) |
| `--bg-1` | `#1b1a19` | raised surfaces: panels, cards, code |
| `--text` | `#efefec` | primary text |
| `--text-soft` | `#a4a5a7` | secondary text, ledes |
| `--muted` | `#737578` | meta, labels, mono UI |
| `--line` / `--line-strong` | `#2b2a29` / `#444240` | hairlines |
| `--accent` / `--writing-accent` | `#e8b56c` (gold surf) | **the one accent**: every link, hover, focus ring, selection, active state |
| `--text-hero` | `#aaa6a0` | second line of the homepage hero |

**Links are gold everywhere.** Use `var(--accent)`, never a color literal,
for anything interactive. Blue is not a link color on this site.

The **night-shore palette** (used in accents and art; diagrams use only gold and coral; keep these exact):

| Role | Value |
| --- | --- |
| Gold surf (primary accent in art contexts) | `#e8b56c` / `rgb(232 181 108)` |
| Coral (findings, failures, warnings) | `#ff9a76` |
| Night-sky wash | `rgb(42 64 156 / ~0.1–0.2)` |
| Warm glow | `rgb(214 150 72 / ~0.06)` |
| Panel hairline | `rgb(236 222 200 / 0.08–0.13)` |
| Nebula blues (writing night sky only) | `rgb(40 50 150)` → `rgb(84 104 232)`, core `rgb(126 146 245)` |
| Embers (writing night sky stars) | `rgb(255 172 98)`, `rgb(242 142 72)`, `rgb(255 202 144)` |

## Type

- **Geist** for prose and headings; **Geist Mono** for UI, meta, labels,
  captions, and everything inside diagrams.
- Headings: weight 600, tight tracking (`-0.04em` for display/titles).
- Mono labels: ~0.64–0.7rem, lowercase (or uppercase for tiny kickers),
  slight letter-spacing, `--muted`.
- Prose stays 1rem–1.0625rem, line-height ~1.65–1.7, `text-wrap: pretty`.

## Recurring motifs

Reuse these instead of inventing new decoration:

- **Soft panel**: `--bg-1` base, a faint night-sky radial wash from one
  corner, an even fainter warm glow in the opposite corner, `1px` hairline in
  the panel-hairline color, radius `12–14px`, a deep soft drop shadow.
- **Gold horizon**: a `1px` line across the top edge of a panel,
  `linear-gradient(90deg, transparent, rgb(232 181 108 / 0.45), transparent)`,
  inset ~12% from each side. Not used on diagrams (they are quiet
  figures, see [writing](writing.md)).
- **Stars**: tiny `radial-gradient(1–1.6px …)` dots in warm white / pale blue
  at low alpha. A handful, never a field.
- **Four-point star `✦`**: gold for the current item and hover states; dim
  (`--line-strong`) as the caption marker for diagrams.
- **Eased fades**: never a two-stop linear fade into the page; use the 9-stop
  smoothstep ramp (`transparent → color-mix(var(--bg) N%) … → var(--bg)`).
  Linear ramps read as a visible band.
