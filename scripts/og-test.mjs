import { writeFileSync } from "node:fs";
import { renderOgImage } from "../src/lib/og.ts";

const longTitle =
  "Why throwing more GPUs at the problem is not enough for large language model inference at scale, and what you should actually measure instead";

const png = await renderOgImage({
  title: longTitle,
  meta: "May 28, 2026 · 12 min read · a very long meta line that should be clipped to one single row only",
});

writeFileSync("/tmp/og-long.png", png);
console.log("wrote /tmp/og-long.png", png.length, "bytes");
