# starptech.com

Personal site of **[Dustin Deus](https://github.com/StarpTech)**

A single-page bio with a small content-collection blog. Built with Astro, Geist, and a tiny bit of TypeScript. No frameworks, no analytics, no cookies.

## Stack

- **[Astro 4](https://astro.build)** — static-site generation, content collections, view transitions
- **[Geist Sans + Mono](https://vercel.com/font)** — self-hosted woff2 (Latin subset), `font-display: swap`, preloaded
- **[three.js](https://threejs.org)** — ambient "signal field" canvas behind the writing (lazy-loaded, opt-in via prop)
- **[Shiki](https://shiki.style)** — dual-theme code highlighting (`github-light` / `github-dark`)
- **[@astrojs/sitemap](https://docs.astro.build/en/guides/integrations-guide/sitemap/)** — auto-generated `sitemap-index.xml`
- **Vanilla CSS** with custom properties for design tokens (no Tailwind, no CSS-in-JS)
- **PostCSS + cssnano-advanced** for minification, autoprefixer for vendor prefixes

## Develop

```sh
pnpm install
pnpm run dev          # http://localhost:4321
pnpm run build        # → dist/
pnpm run preview
```

## Project structure

```
public/
├── builder-background.webp   # og:image
├── favicon.svg               # adapts dark/light via inline <style>
├── fonts/                    # Geist Sans 400/600 + Geist Mono 400 (woff2)
├── humans.txt
└── robots.txt

src/
├── content/
│   ├── config.ts             # blog collection schema (zod)
│   └── blog/*.md             # posts
├── components/
│   ├── Footer.astro
│   ├── Masthead.astro        # name + writing nav (auto-hides when no posts)
│   └── ThemeToggle.astro     # sun/moon icon with smooth crossfade-rotate
├── layouts/
│   └── Layout.astro          # head, JSON-LD, font preload, optional signalField prop
├── pages/
│   ├── index.astro           # home — masthead, lede, prose, latest line, contact
│   ├── index.md.ts           # markdown counterpart of the homepage (for LLMs)
│   ├── llms.txt.ts           # llms.txt entry point — site map for AI agents
│   ├── 404.astro
│   └── blog/
│       ├── index.astro       # writing index (filters drafts)
│       ├── index.md.ts       # markdown counterpart of /blog (served at /blog.md)
│       ├── [...slug].astro   # post template (reading time, dual-theme code blocks)
│       └── [...slug].md.ts   # markdown counterpart of each post (served at /blog/<slug>.md)
├── scripts/
│   ├── agent.client.ts       # theme toggle + DevTools console signature
│   └── signal-field.client.ts# three.js ambient field (loaded when Layout's signalField prop is true)
└── styles/
    └── global.css            # tokens, components, post typography
```

## Authoring posts

Drop a markdown file in `src/content/blog/`:

```md
---
title: "Title"
description: "One-sentence summary used in the listing and meta description."
date: 2026-04-12
draft: false   # set true to hide from listings, sitemap, and routes
---

Body in markdown — h2/h3, blockquote, ordered/unordered lists, inline `code`,
fenced code blocks (Shiki dual-theme), images, tables, hr.
```

Drafts are filtered from:

- the homepage's "Latest:" line
- `/blog` listing
- `/blog/[slug]` static-path generation (no public URL)
- the masthead's `writing` nav link (hidden when no published posts exist)

## SEO

- Per-page `<title>` and meta description
- Canonical URL, `og:*` and `twitter:*` tags
- JSON-LD `Person` schema with `worksFor` and `sameAs`
- `theme-color` for both color schemes
- `robots.txt` and `sitemap-index.xml`

## Accessibility

- Semantic landmarks, real `<a>` and `<button>` elements
- `prefers-reduced-motion` respected (gradient animation pauses, signal field renders one frame)
- `prefers-color-scheme` respected on first paint, persisted via `localStorage`
- 44 × 44 minimum touch targets, focus rings on interactive elements

## LLM-friendly

Every page has a markdown counterpart at the same URL with a `.md` suffix, plus an [`llms.txt`](https://llmstxt.org) at the root that indexes the site for AI agents.

| Route | Markdown alternate |
| --- | --- |
| `/` | `/index.md` |
| `/blog/` | `/blog.md` |
| `/blog/<slug>/` | `/blog/<slug>.md` |
| — | `/llms.txt` (site index) |

**Discovery surfaces:**

- Each HTML page declares its markdown twin via `<link rel="alternate" type="text/markdown" href="…">` in the `<head>`.
- The site footer carries a visible link to `/llms.txt`.
- Each blog post page has a **"Copy as Markdown"** button that fetches the `.md` twin and writes it to the clipboard — useful for pasting into ChatGPT, Claude, Cursor, etc.

Drafts are filtered from `/llms.txt` and don't generate `.md` URLs.

## License

MIT — see [LICENSE](LICENSE).
