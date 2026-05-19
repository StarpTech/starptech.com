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

> Personal site of Dustin Deus — founder and engineer, former co-founder & CTO at WunderGraph, now Principal Engineer at OpenCode.

Dustin Deus has been shipping software for fifteen years. He co-founded WunderGraph and helped turn it from an idea into a company. The team raised Seed, failed with the first product, built Cosmo in four weeks, survived, raised Series A, and found its way to a platform used by teams at eBay, SoundCloud, Paramount, and others to integrate, collaborate on, and operate APIs at scale, today driving tens of billions of requests. He hired the engineering team and helped build a culture around ego-less collaboration, ownership, openness, and high standards. He now works as Principal Engineer at OpenCode, building open-source AI developer tools for developers who want model choice, stack ownership, data control, and cost flexibility. Maintainer or contributor on Cosmo, Fastify, Hemera, and OpenTelemetry.

Every HTML page on this site has a markdown counterpart at the same URL with a \`.md\` suffix (e.g. \`/blog/some-post/\` ↔ \`/blog/some-post.md\`). Use the \`.md\` versions for direct ingestion.

## Pages

- [Home](${base}/index.md): Bio, current focus, philosophy, contact links.
- [Writing index](${base}/blog.md): All published posts with descriptions.

## Posts

${postsSection}

## Optional

- [GitHub @StarpTech](https://github.com/StarpTech): Open-source code and contributions.
- [LinkedIn](https://www.linkedin.com/in/dustin-deus/): Professional profile.
- [OpenCode](https://opencode.ai/): Open-source AI developer tooling.
- [WunderGraph](https://wundergraph.com): The company; open-source platform for federated GraphQL.
- [Email](mailto:deusdustin@gmail.com): Direct contact.
`;

  return new Response(content, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
};
