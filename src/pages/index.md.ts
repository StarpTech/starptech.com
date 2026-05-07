import type { APIRoute } from "astro";

const md = `# Dustin Deus

> Co-founder & CTO at WunderGraph. Builds developer infrastructure for federated GraphQL, distributed systems, and modern API platforms.

**Fifteen years of shipping. Still finding new ways to be wrong.**

Co-founder and CTO at [WunderGraph](https://wundergraph.com), where we build the production-grade platform modern engineering teams use to design, deploy, and operate federated GraphQL at scale.

Started in open source; one of those projects turned into the company. Still mostly in open source — the compounding interest of building in public has been the best thing about my career.

Outside the company, I'm always on the edge — learning, writing occasionally, and studying how developer tooling has to evolve as AI agents become first-class primitives in every workflow.

Small ships, tight feedback loops, durable systems.

## Contact

- GitHub: <https://github.com/StarpTech>
- LinkedIn: <https://www.linkedin.com/in/dustin-deus/>
- Email: <deusdustin@gmail.com>
- WunderGraph: <https://wundergraph.com>
`;

export const GET: APIRoute = () =>
  new Response(md, {
    headers: { "Content-Type": "text/markdown; charset=utf-8" },
  });
