import type { APIRoute } from "astro";
import { getCollection } from "astro:content";

const escapeXml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");

export const GET: APIRoute = async ({ site }) => {
  const base = (site?.toString() ?? "https://starptech.com/").replace(/\/$/, "");
  const posts = (await getCollection("blog"))
    .filter((p) => !p.data.draft)
    .sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());

  const items = posts
    .map((post) => {
      const url = `${base}/blog/${post.slug}/`;
      return `<item>
  <title>${escapeXml(post.data.title)}</title>
  <link>${url}</link>
  <guid>${url}</guid>
  <description>${escapeXml(post.data.description)}</description>
  <category>${escapeXml(post.data.category)}</category>
  <pubDate>${post.data.date.toUTCString()}</pubDate>
</item>`;
    })
    .join("\n");

  const feed = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
  <title>Dustin Deus — Writing</title>
  <link>${base}/blog</link>
  <atom:link href="${base}/rss.xml" rel="self" type="application/rss+xml" />
  <description>Notes on infrastructure, shipping software, and startups.</description>
  <language>en</language>
  <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${items}
</channel>
</rss>`;

  return new Response(feed, {
    headers: { "Content-Type": "application/rss+xml; charset=utf-8" },
  });
};
