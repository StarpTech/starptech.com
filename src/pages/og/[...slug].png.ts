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
        title: "Dustin Deus",
        meta: "Engineer & founder",
        brand: null,
      },
    },
    {
      params: { slug: "blog" },
      props: {
        title: "Notes on infrastructure, shipping software, and startups.",
        meta: "writing",
      },
    },
  ];

  const postPages = posts.map((post) => ({
    params: { slug: `blog/${post.slug}` },
    props: {
      title: post.data.title,
      meta: `${fmtDate(post.data.date)} · ${readingMeta(post.body)} min read`,
      brand: null,
      label: post.data.category,
    },
  }));

  return [...staticPages, ...postPages];
};

export const GET: APIRoute = async ({ props }) => {
  const png = await renderOgImage({
    title: props.title as string,
    meta: props.meta as string | undefined,
    brand: props.brand as string | null | undefined,
    label: props.label as string | undefined,
  });

  return new Response(png, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
};
