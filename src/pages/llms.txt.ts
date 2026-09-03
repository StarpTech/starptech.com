import type { APIRoute } from "astro";
import { getCollection } from "astro:content";

export const GET: APIRoute = async ({ site }) => {
  const base = (site?.toString() ?? "https://starptech.com/").replace(/\/$/, "");
  const posts = (await getCollection("blog"))
    .filter((p) => !p.data.draft)
    .sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());

  const postsSection = posts.length
    ? posts
        .map(
          (p) =>
            `- [${p.data.title}](${base}/blog/${p.slug}.md): ${p.data.description}`,
        )
        .join("\n")
    : "(No posts published yet.)";

  const content = `# Dustin Deus

> Official personal site of Dustin Deus — founder and engineer, former co-founder & CTO at WunderGraph, and first Founding Engineer at Leverage Computer.

## About

Dustin builds companies, engineering teams, and the systems underneath them. He co-founded WunderGraph, helped raise its Seed and Series A rounds, hired its engineering team, and helped build Cosmo into an API platform used by teams including eBay, SoundCloud, and Paramount. After a short chapter responsible for the inference stack at OpenCode, he joined Leverage Computer as its first Founding Engineer.

## Current focus

Dustin is helping build Leverage Computer, its engineering team, and the company computer: an AI-native system that connects a company's people, knowledge, and work.

## Canonical pages

- [Home](${base}/index.md): Biography, experience, current focus, and contact links.
- [Writing](${base}/blog.md): Index of all published writing with dates and descriptions.

Every public HTML page has a Markdown counterpart for direct ingestion. The homepage is \`/index.md\`, the writing index is \`/blog.md\`, and each post is available at \`/blog/{slug}.md\`.

## Published writing

${postsSection}

## External profiles and organizations

- [GitHub @StarpTech](https://github.com/StarpTech): Open-source code and contributions.
- [LinkedIn](https://www.linkedin.com/in/dustin-deus/): Professional profile.
- [Leverage Computer](https://leverage.computer/): Current company; [open roles](https://leverage.computer/careers/).
- [OpenCode](https://opencode.ai/): Previous inference-stack work.
- [WunderGraph](https://wundergraph.com/): Company Dustin co-founded.
- [Email](mailto:deusdustin@gmail.com): Direct contact.
`;

  return new Response(content, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "X-Robots-Tag": "noindex, follow",
    },
  });
};
