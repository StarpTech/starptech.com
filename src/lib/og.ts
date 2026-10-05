import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";

/* ----------------------------------------------------------------------------
 * Social preview (Open Graph) image generation.
 *
 * Renders a 1200×630 PNG with satori (JSX-like nodes → SVG) and rasterizes it
 * with resvg. Runs at build time only, so the output stays fully static.
 * ------------------------------------------------------------------------- */

export const OG_WIDTH = 1200;
export const OG_HEIGHT = 630;

const font = (path: string) =>
  readFileSync(fileURLToPath(new URL(path, import.meta.url)));

// satori supports ttf/otf/woff (not woff2) — fontsource ships .woff.
const geistRegular = font(
  "../../node_modules/@fontsource/geist-sans/files/geist-sans-latin-400-normal.woff",
);
const geistSemiBold = font(
  "../../node_modules/@fontsource/geist-sans/files/geist-sans-latin-600-normal.woff",
);
const geistMono = font(
  "../../node_modules/@fontsource/geist-mono/files/geist-mono-latin-400-normal.woff",
);

// The homepage painting (shore-2, cropped around the walker), embedded as a
// data URI. satori can't decode webp, so the crop is a committed JPEG.
// Root-relative like the fonts: resolves from src/lib and dist/chunks alike.
const shoreJpg = readFileSync(
  fileURLToPath(new URL("../../src/assets/og/shore.jpg", import.meta.url)),
);
const shoreDataUri = `data:image/jpeg;base64,${shoreJpg.toString("base64")}`;

// Four-point star (✦) as SVG: Geist's latin subset has no glyph for it.
const starDataUri = (fill: string) =>
  `data:image/svg+xml;base64,${Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="${fill}" d="M12 0C12.9 7.6 16.4 11.1 24 12C16.4 12.9 12.9 16.4 12 24C11.1 16.4 7.6 12.9 0 12C7.6 11.1 11.1 7.6 12 0Z"/></svg>`,
  ).toString("base64")}`;

// Night-shore tokens, mirrored from src/styles/global.css (see docs/style-guide.md).
const BG = "#161514";
const BG_RGB = "22,21,20";
const TEXT = "#efefec";
const TEXT_SOFT = "#a4a5a7";
const TEXT_HERO = "#aaa6a0";
const MUTED = "#737578";
const GOLD = "#e8b56c";

/** The site's eased fade: 9-stop smoothstep ramp from page color to clear. */
function easedFade(direction: string): string {
  const stops = Array.from({ length: 9 }, (_, i) => {
    const t = i / 8;
    const alpha = 1 - t * t * (3 - 2 * t);
    return `rgba(${BG_RGB},${alpha.toFixed(3)}) ${(t * 100).toFixed(1)}%`;
  });
  return `linear-gradient(${direction}, ${stops.join(", ")})`;
}

export interface OgOptions {
  /** Headline shown large on the card. */
  title: string;
  /** Optional second headline line in the softer hero color. */
  subtitle?: string;
  /** Mono sub-line: e.g. "Mar 4, 2026 · 6 min read". */
  meta?: string;
  /** Short mono kicker above the title, marked with a gold star. */
  label?: string;
}

/** Scale the title font down as it gets longer so it stays on the card. */
function titleSize(title: string): number {
  const len = title.length;
  if (len <= 30) return 64;
  if (len <= 60) return 52;
  if (len <= 100) return 44;
  if (len <= 130) return 38;
  return 34;
}

/** Hard cap text length, cutting on a word boundary and adding an ellipsis.
 *  Guards against pathologically long titles overflowing the card. */
function clampText(text: string, max: number): string {
  const t = text.trim();
  if (t.length <= max) return t;
  const slice = t.slice(0, max - 1);
  const lastSpace = slice.lastIndexOf(" ");
  return `${(lastSpace > max * 0.6 ? slice.slice(0, lastSpace) : slice).trimEnd()}…`;
}

type SatoriNode = {
  type: string;
  props: Record<string, unknown> & { children?: unknown };
};

const h = (
  type: string,
  props: Record<string, unknown>,
  ...children: unknown[]
): SatoriNode => {
  const kids = children.filter((c) => c !== null && c !== undefined);
  // satori requires every div to declare an explicit display value.
  const style = (props.style as Record<string, unknown>) ?? {};
  const mergedStyle =
    type === "div" && style.display === undefined
      ? { ...style, display: "flex" }
      : style;
  return {
    type,
    props: {
      ...props,
      style: mergedStyle,
      children: kids.length === 1 ? kids[0] : kids,
    },
  };
};

// A handful of faint stars over the text side, never a field.
const STARS = [
  { x: 548, y: 64, r: 1.6, c: "rgba(255,236,214,0.55)" },
  { x: 392, y: 132, r: 1.1, c: "rgba(196,210,255,0.45)" },
  { x: 618, y: 214, r: 1.2, c: "rgba(255,236,214,0.4)" },
  { x: 236, y: 548, r: 1.1, c: "rgba(196,210,255,0.35)" },
  { x: 584, y: 520, r: 1.4, c: "rgba(255,236,214,0.4)" },
];

const PAINTING_LEFT = 700;

export async function renderOgImage({
  title,
  subtitle,
  meta,
  label,
}: OgOptions): Promise<Buffer> {
  const safeTitle = clampText(title, 130);
  const safeMeta = meta ? clampText(meta, 48) : null;
  // Two-line headlines (the home hero) keep each line on one row.
  const size = subtitle ? 48 : titleSize(safeTitle);

  const absolute = (style: Record<string, unknown>) =>
    h("div", { style: { position: "absolute", ...style } });

  const tree = h(
    "div",
    {
      style: {
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        backgroundColor: BG,
        padding: "64px 76px",
        fontFamily: "Geist",
        overflow: "hidden",
      },
    },
    // The painting, dissolving into the page on its left edge.
    h("img", {
      src: shoreDataUri,
      width: OG_WIDTH - PAINTING_LEFT,
      height: OG_HEIGHT,
      style: {
        position: "absolute",
        top: 0,
        left: PAINTING_LEFT,
        objectFit: "cover",
      },
    }),
    absolute({
      top: 0,
      left: PAINTING_LEFT - 1,
      width: 260,
      height: OG_HEIGHT,
      backgroundImage: easedFade("to right"),
    }),
    absolute({
      top: 0,
      left: PAINTING_LEFT,
      right: 0,
      height: 90,
      backgroundImage: easedFade("to bottom"),
      opacity: 0.55,
    }),
    absolute({
      bottom: 0,
      left: PAINTING_LEFT,
      right: 0,
      height: 110,
      backgroundImage: easedFade("to top"),
      opacity: 0.7,
    }),

    // Night-sky wash from the top-left, a fainter warm glow from below.
    absolute({
      top: -420,
      left: -360,
      width: 1100,
      height: 900,
      backgroundImage:
        "radial-gradient(closest-side, rgba(42,64,156,0.2) 0%, rgba(42,64,156,0.07) 55%, transparent 100%)",
    }),
    absolute({
      bottom: -360,
      left: 80,
      width: 800,
      height: 600,
      backgroundImage:
        "radial-gradient(closest-side, rgba(214,150,72,0.07) 0%, transparent 100%)",
    }),
    ...STARS.map((s) =>
      absolute({
        left: s.x,
        top: s.y,
        width: s.r * 2,
        height: s.r * 2,
        borderRadius: 999,
        backgroundColor: s.c,
      }),
    ),

    // Site mark, no name.
    h(
      "div",
      {
        style: {
          color: MUTED,
          fontFamily: "Geist Mono",
          fontSize: 16,
          letterSpacing: "0.04em",
        },
      },
      "starptech.com",
    ),

    // Title block: kicker, headline, meta. No card, just spacing.
    h(
      "div",
      {
        style: {
          display: "flex",
          width: 640,
          flexDirection: "column",
        },
      },
      label
        ? h(
            "div",
            {
              style: {
                display: "flex",
                alignItems: "center",
                gap: 12,
                marginBottom: 26,
                color: TEXT_SOFT,
                fontFamily: "Geist Mono",
                fontSize: 16,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
              },
            },
            h("img", { src: starDataUri(GOLD), width: 14, height: 14 }),
            label,
          )
        : null,
      h(
        "div",
        {
          style: {
            display: "flex",
            flexDirection: "column",
            fontSize: size,
            fontWeight: 600,
            lineHeight: 1.08,
            letterSpacing: "-0.04em",
          },
        },
        h("div", { style: { color: TEXT } }, safeTitle),
        subtitle ? h("div", { style: { color: TEXT_HERO } }, subtitle) : null,
      ),
      safeMeta
        ? h(
            "div",
            {
              style: {
                marginTop: 28,
                color: MUTED,
                fontSize: 20,
                fontFamily: "Geist Mono",
                letterSpacing: "0.01em",
              },
            },
            safeMeta,
          )
        : null,
    ),

    // Empty footer row keeps the title block centered between the edges.
    h("div", { style: { height: 1 } }),
  );

  const svg = await satori(tree as unknown as Parameters<typeof satori>[0], {
    width: OG_WIDTH,
    height: OG_HEIGHT,
    fonts: [
      { name: "Geist", data: geistRegular, weight: 400, style: "normal" },
      { name: "Geist", data: geistSemiBold, weight: 600, style: "normal" },
      { name: "Geist Mono", data: geistMono, weight: 400, style: "normal" },
    ],
  });

  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: OG_WIDTH },
  });
  return Buffer.from(resvg.render().asPng());
}
