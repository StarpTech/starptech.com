import type { APIRoute, GetStaticPaths } from "astro";
import { getCollection, type CollectionEntry } from "astro:content";

export const getStaticPaths: GetStaticPaths = async () => {
  const posts = (await getCollection("blog")).filter((p) => !p.data.draft);
  return posts.map((post) => ({
    params: { slug: post.slug },
    props: { post },
  }));
};

export const GET: APIRoute = async ({ props, site }) => {
  const post = props.post as CollectionEntry<"blog">;
  const base = (site?.toString() ?? "https://starptech.com/").replace(/\/$/, "");
  const date = post.data.date.toISOString().slice(0, 10);
  const canonical = `${base}/blog/${post.slug}/`;

  const md = `---
title: ${JSON.stringify(post.data.title)}
description: ${JSON.stringify(post.data.description)}
date: ${date}
canonical: ${canonical}
---

# ${post.data.title}

> ${post.data.description}

${post.body.trim()}
`;

  return new Response(md, {
    headers: { "Content-Type": "text/markdown; charset=utf-8" },
  });
};
