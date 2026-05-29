import type { APIRoute } from "astro";

const md = `# Dustin Deus

> Founder and engineer. Former co-founder & CTO at WunderGraph. Now Principal Engineer at OpenCode, building open-source AI developer tools.

**Fifteen years of shipping. Still finding new ways to be wrong.**

I co-founded [WunderGraph](https://wundergraph.com) and helped build it from an idea into a real company. We raised our Seed round, failed with the first product, built Cosmo in four weeks, survived, raised our Series A, and found our way to a platform used by teams at eBay, SoundCloud, Paramount, and others to integrate, collaborate on, and operate APIs at scale, today driving tens of billions of requests.

As a first-time founder, that journey changed how I build. I hired every engineer myself and helped shape a culture around ego-less collaboration, openness, ownership, and high standards. Building something from scratch that supports dozens of people and their families is hard to describe. It stays with you.

Now I'm a Principal Engineer at [OpenCode](https://opencode.ai/). AI is changing how software gets written, shipped, and maintained. I want developers to keep control: choose their models, own their stack, protect their data, and optimize costs without getting locked into closed ecosystems.

Notes on infrastructure, shipping software, and startups.

## Contact

- GitHub: <https://github.com/StarpTech>
- LinkedIn: <https://www.linkedin.com/in/dustin-deus/>
- Email: <deusdustin@gmail.com>
- OpenCode: <https://opencode.ai/>
- WunderGraph: <https://wundergraph.com>
`;

export const GET: APIRoute = () =>
  new Response(md, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "X-Robots-Tag": "noindex, follow",
    },
  });
