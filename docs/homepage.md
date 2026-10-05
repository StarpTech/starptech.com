# Homepage

How the homepage works and the rules it keeps. The visual language behind it
is in the [style guide](style-guide.md).

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
  - **The clue:** ~1.6s after the painting is ready, the first visible
    walker plays the hover trace once on its own (`.is-hinting`: fade in,
    one glint lap, fade out, ~4s). Only until the visitor has stepped through
    once (`localStorage["shore-art"]` is set on the first swap), never in a
    background tab, never under reduced motion; hovering takes over at once.
- **Sound:** made with ElevenLabs (see [development](development.md)).
  - `public/sounds/shore.mp3`: a slow, distant night-surf loop. **Never
    automatic**: off on every visit (not remembered), plays only while the
    visitor has the round speaker icon switched on: readable soft white at
    rest, gold when on. On desktop it is fixed bottom-left; up to 1100px it
    sits at the bottom-right of the hero headline and scrolls away with it,
    because browser toolbars cover the bottom of the screen. Web Audio loop
    with fades; loaded only when on.
  - `public/sounds/step.mp3`: a light starlight twinkle (no water) that
    always plays when a walker is clicked, since that click is the visitor's
    own gesture; prefetched on pointer-over. The ambience ducks under it.
  - No other UI sounds.
- **Copy order:** the WunderGraph story leads (it's the stronger
  credential), OpenCode closes it, then a small gold `Now` label with
  one sentence about Leverage. No cards, no CV-style timelines.
- **Header:** name + writing on the left; on ≤600px a burger opens a sheet
  from the right (`Masthead.astro`).
