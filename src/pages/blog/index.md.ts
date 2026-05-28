import type { APIRoute } from "astro";
import { getCollection } from "astro:content";

export const GET: APIRoute = async ({ site }) => {
  const base = (site?.toString() ?? "https://starptech.com/").replace(/\/$/, "");
  const posts = (await getCollection("blog"))
    .filter((p) => !p.data.draft)
    .sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());

  const list = posts.length
    ? posts
        .map((p) => {
          const date = p.data.date.toISOString().slice(0, 10);
          return `- [${p.data.title}](${base}/blog/${p.slug}.md) — ${date}\n  ${p.data.description}`;
        })
        .join("\n\n")
    : "_No posts published yet._";

  const md = `# Writing — Dustin Deus

Notes on infrastructure, shipping software, and startups.

## Posts

${list}
`;

  return new Response(md, {
    headers: { "Content-Type": "text/markdown; charset=utf-8" },
  });
};
