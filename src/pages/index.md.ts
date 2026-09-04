import type { APIRoute } from "astro";

const md = `# Dustin Deus

> Founder and engineer. Former co-founder & CTO at WunderGraph. Now Founding Engineer at Leverage Computer, building the company computer.

**I build companies. And the systems underneath.**

I co-founded [WunderGraph](https://wundergraph.com). Our first product failed; four weeks later, we built Cosmo. We raised Seed and Series A, and today it handles tens of billions of API requests for teams including eBay, SoundCloud, and Paramount.

I helped build the engineering team and a low-ego engineering culture of openness, ownership, and high standards. That experience changed how I think about leadership and still shapes how I build.

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
