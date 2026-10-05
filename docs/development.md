# Development

- `pnpm dev` (port 4400, see `.claude/launch.json`) and `pnpm build`.
- Production preview of a build: `pnpm preview`.
- Sounds are generated with ElevenLabs by `scripts/generate-sounds.mjs`: the
  key is read from `.env` (`ELEVENLABS_KEY`, git-ignored) and never ships;
  each run writes a new take to `public/sounds/`, so listen before keeping.

## Gotchas

- When generating CSS gradients programmatically, keep the commas between
  color stops. A single missing comma silently drops the whole declaration.
- Inside nested `@media` blocks, a later rule for the same selector wins:
  put per-breakpoint overrides *after* the defaults.
- The in-app preview browser pauses image decoding and `requestAnimationFrame`
  while its pane is hidden; verify the homepage art with the pane visible.
- `src/scripts/signal-field.client.ts` (procedural shader background) is no
  longer used by any page; `three` is no longer imported anywhere.
- `src/lib/og.ts` reads files with paths relative to `import.meta.url`
  that start with `../../` so they resolve from both `src/lib/` and the
  bundled `dist/chunks/`. Paths that don't go up to the repo root break the build.
