# AGENTS.md — starptech.com

Personal site of Dustin Deus. Astro 4, vanilla CSS, no framework, no tracking.
Run `pnpm dev` (port 4400 via `.claude/launch.json`) and `pnpm build`.

This file documents the **visual language**. Read it before touching styles,
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

The **night-shore palette** (used in diagrams and accents; keep these exact):

| Role | Value |
| --- | --- |
| Gold surf (primary accent in art contexts) | `#e8b56c` / `rgb(232 181 108)` |
| Moonlit blue (secondary, diagrams only) | `#8aaaf0` |
| Coral (findings, failures, warnings) | `#ff9a76` |
| Night-sky wash | `rgb(42 64 156 / ~0.1–0.2)` |
| Warm glow | `rgb(214 150 72 / ~0.06)` |
| Panel hairline | `rgb(236 222 200 / 0.08–0.13)` |

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
  inset ~12% from each side. Used on diagram panels.
- **Stars**: tiny `radial-gradient(1–1.6px …)` dots in warm white / pale blue
  at low alpha. A handful, never a field.
- **Four-point star `✦`** in gold as the caption marker for diagrams.
- **Eased fades**: never a two-stop linear fade into the page; use the 9-stop
  smoothstep ramp (`transparent → color-mix(var(--bg) N%) … → var(--bg)`).
  Linear ramps read as a visible band.

## Homepage

`src/pages/index.astro`, `src/components/ShoreArt.astro`,
`src/scripts/shore-art.client.ts`.

- **The painting** (`public/art/shore-1.webp`, `shore-2.webp`, 1000×2000).
  Painting 2 is the default; the visitor's choice is remembered in
  `localStorage["shore-art"]`.
  - Desktop (>1100px): fixed panel on the left
    (`round(down, clamp(340px, 40vw, 700px), 1px)` — whole pixels, see the
    band note below),
    dissolving into the page on the right/top/bottom via the `::after`
    overlay (eased fades in page color, *not* CSS masks: masks on the drifting
    layer cause repaint glitches). The text column starts beside it.
  - Phones/tablets (≤1100px): a band at the top
    (`round(down, min(66vh, 640px), 1px)` — keep the height a whole pixel or a
    seam appears). Solid page color behind the header, vivid painting below,
    a short eased fade at the bottom. The hero is pinned so its last line sits
    just above the painting's bottom edge, then a clear gap before the story.
  - Life: a very slow drift/zoom, glints that flicker on the painting's warm
    bright pixels (sampled from the image), and a slow sheen across them.
- **Walkers are doors.** Each person in a painting is a hidden button
  (`WALKERS` in `shore-art.client.ts`: bounding box + traced SVG silhouette in
  image pixels). Hover draws a hairline of light along the silhouette with a
  glint travelling around it — no glow, no pulse. Click reveals the other
  painting in a soft-edged circle growing from that walker while the current
  one dims. When tracing a new figure, verify the outline against the image
  before shipping.
- **Sound:** made with ElevenLabs via `scripts/generate-sounds.mjs` (key in
  `.env`, never shipped).
  - `public/sounds/shore.mp3`: a slow, distant night-surf loop. **Never
    automatic**: off on every visit (not remembered), plays only while the
    visitor has the round speaker icon switched on (fixed bottom-left on
    desktop; up to 1100px it sits at the bottom-right of the hero headline only and
    scrolls away with it, because browser toolbars cover the bottom of the
    screen) (readable soft white
    at rest, gold when on). Web Audio loop with fades; loaded only when on.
  - `public/sounds/step.mp3`: a light starlight twinkle (no water) that
    always plays when a walker is clicked, since that click is the visitor's
    own gesture; prefetched on pointer-over. The ambience ducks under it.
  - No other UI sounds.
- **Copy order:** the WunderGraph story leads (it's the stronger
  credential), OpenCode closes it, then a small gold `Now` label with
  one sentence about Leverage. No cards, no CV-style timelines.
- **Header:** name + writing on the left; on ≤600px a burger opens a sheet
  from the right (`Masthead.astro`).

## Writing pages

`src/pages/blog/index.astro`, `src/pages/blog/[...slug].astro`.

- **Writing index:** the statement headline and intro, then the
  notes grouped by year on the same thread as the table of contents: one dim
  gold point per note that becomes a glowing `✦` on hover, a mono meta line
  (category · date · minutes), the title in display weight, the description
  in muted text. No row dividers; spacing does the separating.
- `spotlight` is on: `body.has-spotlight` paints the night-sky wash, a warm
  breath top-right, and a dozen faint, slowly twinkling stars across the top.
  It scrolls away with the page and must never sit behind body text.
- Posts end with **previous / next** (`.post-neighbours`): a faint gold
  horizon line above, tiny uppercase mono labels with a dim gold `✦`, and the
  titles in soft sans (0.95rem, weight 500). Quiet, never prominent; no
  panel, and deliberately *not* the references style (no underlined mono).
  Hover turns the title gold and nudges the arrow.
- Code blocks use the soft panel (radius 12px, hairline, `--bg-1`), a
  `✦ code` label over a fading hairline, and a single dark Shiki theme
  (`github-dark`).
- **Layout:** the text column stays narrow (~34rem); diagrams and code break
  out to `min(46rem, 100vw - 4rem)` centered on it from 860px up. From
  1280px a table of contents (`.post-toc`, h2s from `post.render()`) starts
  level with the article's meta line and then sticks while you scroll, in
  the left margin, as a **constellation**: a faint thread with a
  dim point per section, small gold stars for sections already read, a
  glowing gold `✦` on the current one, and the thread filled with gold up to
  it. Labels in small sans, no heading. It ends before the breakout edge;
  keep it that way. Only for posts with 3+ sections.
- **Shareable headings:** every h2/h3 in a post gets a quiet link button
  (`.heading-link`, added client-side): hidden until the heading is hovered
  (always faintly visible on touch), copies a deep link with a gold "link
  copied" note, or opens the native share sheet on touch devices.
- **One ending:** the quiet share line sits right after the last sentence
  (moved ahead of the in-markdown references by a tiny inline script), then
  a single gold horizon line (above the references, or above previous/next
  when there are none), then previous/next. No "back to writing" (the masthead
  already links there), no extra dividers. The top bar holds only "Copy as
  Markdown".

## Diagrams in posts

Diagrams are plain HTML inside the markdown, styled by the `inference-viz`
family. Keep every new diagram inside this family so posts stay consistent.

```html
<figure class="inference-viz viz-<name>" data-inference-viz="<name>"
        aria-label="What the diagram shows">
  <figcaption>One short sentence, sentence case.</figcaption>
  …
</figure>
```

- The figure is the **soft panel with a gold horizon**; the caption gets the
  gold `✦` automatically.
- Use the shared variables, never raw colors: `--viz-accent` (gold),
  `--viz-accent-2` (moonlit blue), `--viz-warm` (coral), `--viz-line`,
  `--viz-dim`, `--viz-surface`, `--viz-radius` (8px).
- Building blocks: `.viz-card`, `.viz-node`, `.viz-step`, `.viz-pool`,
  `.viz-tier`, `.viz-kicker` (tiny mono label), `strong` (mono value),
  `small` (mono note), `.viz-link` + `.viz-packet` (a dashed connector with a
  glowing point of light travelling along it). Highlight one element with
  `.is-hot` (gold) — one per diagram, at most two.
- Semantics of color: gold = the thing that matters / the answer; blue =
  secondary or "done"; coral = failure, finding, or open question.
- Motion: `src/scripts/inference-viz.client.ts` adds `.is-active` when the
  figure scrolls into view and staggers a reveal of the building blocks
  (add new block classes to its selector). Continuous animations only run
  under `.is-active` and stop under reduced motion.
- Mobile (≤540px): grids collapse to one column; horizontal flows become
  vertical (links rotate). Check every diagram at 375px for horizontal scroll.
- Mark illustrative data as illustrative in the caption.

## Gotchas

- When generating CSS gradients programmatically, keep the commas between
  color stops. A single missing comma silently drops the whole declaration.
- Inside nested `@media` blocks, a later rule for the same selector wins:
  put per-breakpoint overrides *after* the defaults.
- The in-app preview browser pauses image decoding and `requestAnimationFrame`
  while its pane is hidden; verify the homepage art with the pane visible.
- `src/scripts/signal-field.client.ts` (procedural shader background) is no
  longer used by any page; `three` is no longer imported anywhere.
