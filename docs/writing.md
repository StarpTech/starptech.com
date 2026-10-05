# Writing pages and diagrams

The writing index, the post layout, and the diagram family used inside posts.
The visual language behind them is in the [style guide](style-guide.md).

## Pages

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
