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

  const content = `# starptech.com

> Personal site of Dustin Deus — co-founder & CTO at WunderGraph, building developer infrastructure for federated GraphQL, distributed systems, and modern API platforms.

Dustin Deus has been shipping software for fifteen years. Co-founder & CTO at WunderGraph, where the team builds the production-grade platform modern engineering teams use to design, deploy, and operate federated GraphQL at scale. Started in open source; one of those projects turned into the company. Maintainer or contributor on Cosmo, Fastify, Hemera, and OpenTelemetry.

Every HTML page on this site has a markdown counterpart at the same URL with a \`.md\` suffix (e.g. \`/blog/some-post/\` ↔ \`/blog/some-post.md\`). Use the \`.md\` versions for direct ingestion.

## Pages

- [Home](${base}/index.md): Bio, current focus, philosophy, contact links.
- [Writing index](${base}/blog.md): All published posts with descriptions.

## Posts

${postsSection}

## Optional

- [GitHub @StarpTech](https://github.com/StarpTech): Open-source code and contributions.
- [LinkedIn](https://www.linkedin.com/in/dustin-deus/): Professional profile.
- [WunderGraph](https://wundergraph.com): The company; open-source platform for federated GraphQL.
- [Email](mailto:deusdustin@gmail.com): Direct contact.
`;

  return new Response(content, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
};
