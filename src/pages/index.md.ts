import type { APIRoute } from "astro";

const md = `# Dustin Deus

> Founder and engineer. Former co-founder & CTO at WunderGraph. Now Founding Engineer at Leverage Computer, building the company computer.

**I build from zero. Companies, teams, and the systems underneath.**

I co-founded [WunderGraph](https://wundergraph.com) and helped turn it from an idea into a real company. The first product failed. We built Cosmo in four weeks, raised Seed and Series A, and today it helps teams at eBay, SoundCloud, Paramount, and others handle tens of billions of API requests.

I hired every engineer and helped shape a culture around ego-less collaboration, openness, ownership, and high standards. Building something that supports dozens of people and their families changes you. That experience still shapes how I build.

## Now

**Building the company computer.**

After a short chapter running the inference stack at [OpenCode](https://opencode.ai/), I joined Leverage Computer as its first Founding Engineer. I’m helping build the company, team, and an AI-native system that connects a company’s people, knowledge, and work from the ground up.

[Explore Leverage Computer](https://leverage.computer/)

## Contact

- GitHub: <https://github.com/StarpTech>
- LinkedIn: <https://www.linkedin.com/in/dustin-deus/>
- Email: <deusdustin@gmail.com>
- Leverage Computer: <https://leverage.computer/>
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
