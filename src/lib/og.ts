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

// brand icon (rounded-square gradient slash), embedded as a data URI
const iconSvg = readFileSync(
  fileURLToPath(new URL("../../public/icon.svg", import.meta.url)),
).toString("utf8");
const iconDataUri = `data:image/svg+xml;base64,${Buffer.from(iconSvg).toString("base64")}`;

// Brand tokens, mirrored from src/styles/global.css (dark theme).
const BG = "#0a0a0a";
const TEXT = "#fafafa";
const MUTED = "#a3a3a3";
const GRADIENT = ["#60a5fa", "#a78bfa", "#f472b6", "#fbbf24"];

export interface OgOptions {
  /** Headline shown large on the card. */
  title: string;
  /** Mono sub-line: e.g. "Mar 4, 2026 · 6 min read" or a section label. */
  meta?: string;
  /** Wordmark text next to the icon. Pass null to show the icon only
   *  (e.g. on the home card, where the title already is the name). */
  brand?: string | null;
  /** Short context label in the top-right corner. */
  label?: string;
}

/** Scale the title font down as it gets longer so it stays on the card. */
function titleSize(title: string): number {
  const len = title.length;
  if (len <= 40) return 68;
  if (len <= 70) return 56;
  if (len <= 110) return 46;
  if (len <= 150) return 40;
  return 36;
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

export async function renderOgImage({
  title,
  meta,
  brand = "Dustin Deus",
  label,
}: OgOptions): Promise<Buffer> {
  const isHome = brand === null;
  const eyebrow = label ?? (isHome ? "SOFTWARE / SYSTEMS / STARTUPS" : meta === "writing" ? "WRITING" : "System note");
  const safeTitle = clampText(title, 150);
  const safeMeta = meta ? clampText(meta, 64) : "starptech.com";

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
        padding: "66px 76px",
        fontFamily: "Geist",
        overflow: "hidden",
      },
    },
    // Restrained atmosphere: black field, architectural plane, narrow color edge.
    h("div", {
      style: {
        position: "absolute",
        top: -260,
        right: -180,
        width: 740,
        height: 740,
        borderRadius: 999,
        backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.055) 0%, transparent 64%)",
      },
    }),
    h("div", {
      style: {
        position: "absolute",
        top: -210,
        right: 118,
        width: 236,
        height: 1060,
        transform: "rotate(34deg)",
        transformOrigin: "center",
        borderRadius: 28,
        border: "1px solid rgba(255,255,255,0.10)",
        backgroundImage:
          "linear-gradient(180deg, transparent 0%, rgba(255,255,255,0.052) 20%, rgba(255,255,255,0.018) 60%, transparent 88%)",
      },
    }),
    h("div", {
      style: {
        position: "absolute",
        top: -178,
        right: 214,
        width: 54,
        height: 980,
        transform: "rotate(34deg)",
        transformOrigin: "center",
        borderRadius: 18,
        backgroundImage:
          "linear-gradient(180deg, transparent 0%, rgba(255,255,255,0.11) 22%, rgba(255,255,255,0.04) 62%, transparent 88%)",
      },
    }),
    h("div", {
      style: {
        position: "absolute",
        top: -116,
        right: 262,
        width: 7,
        height: 830,
        transform: "rotate(34deg)",
        transformOrigin: "center",
        borderRadius: 999,
        backgroundImage: `linear-gradient(180deg, transparent 0%, ${GRADIENT[0]} 32%, ${GRADIENT[1]} 56%, transparent 84%)`,
        opacity: 0.78,
      },
    }),

    // Quiet frame: enough structure to feel designed, not decorated.
    h("div", {
      style: {
        position: "absolute",
        top: 32,
        left: 32,
        right: 32,
        bottom: 32,
        border: "1px solid rgba(255,255,255,0.11)",
        borderRadius: 32,
      },
    }),

    // Brand row.
    h(
      "div",
      {
        style: {
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          color: TEXT,
          width: "100%",
        },
      },
      h(
        "div",
        {
          style: {
            display: "flex",
            alignItems: "center",
            gap: 16,
          },
        },
        h("img", {
          src: iconDataUri,
          width: 50,
          height: 50,
          style: { borderRadius: 13 },
        }),
        brand
          ? h(
              "div",
              {
                style: {
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                },
              },
              h(
                "div",
                {
                  style: {
                    fontSize: 27,
                    fontWeight: 600,
                    letterSpacing: "-0.02em",
                  },
                },
                brand,
              ),
              h(
                "div",
                {
                  style: {
                    color: MUTED,
                    fontFamily: "Geist Mono",
                    fontSize: 13,
                    letterSpacing: "0.16em",
                  },
                },
                "STARPTECH.COM",
              ),
            )
          : h(
              "div",
              {
                style: {
                  fontFamily: "Geist Mono",
                  fontSize: 15,
                  letterSpacing: "0.18em",
                  color: MUTED,
                },
              },
              "STARPTECH.COM",
            ),
      ),
      h(
        "div",
        {
          style: {
            display: "flex",
            alignItems: "center",
            color: MUTED,
            fontFamily: "Geist Mono",
            fontSize: 14,
            letterSpacing: "0.16em",
          },
        },
        eyebrow,
      ),
    ),

    // Title block: no card, just careful spacing.
    h(
      "div",
      {
        style: {
          display: "flex",
          width: 790,
          flexDirection: "column",
          gap: 24,
        },
      },
      h(
        "div",
        {
          style: {
            color: TEXT,
            fontSize: titleSize(safeTitle),
            fontWeight: 600,
            lineHeight: 1.1,
            letterSpacing: "-0.02em",
            display: "flex",
            width: "100%",
          },
        },
        safeTitle,
      ),
      h(
        "div",
        {
          style: {
            color: MUTED,
            fontSize: 24,
            fontFamily: "Geist Mono",
            letterSpacing: "0.01em",
            display: "flex",
          },
        },
        safeMeta,
      ),
    ),

    // Quiet footer mark, no extra copy competing with the title.
    h(
      "div",
      {
        style: {
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-start",
          width: "100%",
        },
      },
      h("div", {
        style: {
          width: 120,
          height: 2,
          backgroundColor: "rgba(255,255,255,0.18)",
        },
      }),
    ),
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
