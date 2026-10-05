import type { APIRoute, GetStaticPaths } from "astro";
import { getCollection } from "astro:content";
import { renderOgImage } from "../../lib/og";

const fmtDate = (d: Date) =>
  d.toLocaleDateString("en", { year: "numeric", month: "short", day: "numeric" });

const readingMeta = (body: string) => {
  const words = body.split(/\s+/g).filter(Boolean).length;
  return Math.max(1, Math.round(words / 220));
};

export const getStaticPaths: GetStaticPaths = async () => {
  const posts = (await getCollection("blog")).filter((p) => !p.data.draft);

  const staticPages = [
    {
      params: { slug: "index" },
      props: {
        title: "I build companies.",
        subtitle: "And the systems underneath.",
        label: "Founder & engineer",
      },
    },
    {
      params: { slug: "blog" },
      props: {
        title: "Where systems meet reality.",
        label: "Writing",
      },
    },
  ];

  const postPages = posts.map((post) => ({
    params: { slug: `blog/${post.slug}` },
    props: {
      title: post.data.title,
      meta: `${fmtDate(post.data.date)} · ${readingMeta(post.body)} min read`,
      label: post.data.category,
    },
  }));

  return [...staticPages, ...postPages];
};

export const GET: APIRoute = async ({ props }) => {
  const png = await renderOgImage({
    title: props.title as string,
    subtitle: props.subtitle as string | undefined,
    meta: props.meta as string | undefined,
    label: props.label as string | undefined,
  });

  return new Response(png, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
};
