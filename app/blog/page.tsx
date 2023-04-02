import Link from "next/link";
import React from "react";
import { allBlogPosts } from "contentlayer/generated";
import { Navigation } from "../components/nav";
import { Card } from "../components/card";
import { Article } from "./article";

export const revalidate = 60;
export default async function BlogPage() {

	const sorted = allBlogPosts
		.filter((p) => p.published)
		.sort(
			(a, b) =>
				new Date(b.date ?? Number.POSITIVE_INFINITY).getTime() -
				new Date(a.date ?? Number.POSITIVE_INFINITY).getTime(),
		);

		const featured = sorted[0]
		const top2 = sorted[1]
		const top3 = sorted[2]

		const all = sorted.filter(p => p.slug !== featured.slug && p.slug !== top2.slug && p.slug !== top3.slug)

	return (
		<div className="relative pb-16">
			<Navigation />
			<div className="px-6 pt-16 mx-auto space-y-8 max-w-7xl lg:px-8 md:space-y-16 md:pt-24 lg:pt-32">
				<div className="max-w-2xl mx-auto lg:mx-0">
					<h2 className="text-3xl font-bold tracking-tight text-zinc-100 sm:text-4xl">
					Engineer Journey
					</h2>
					<p className="mt-4 text-zinc-400">
						Worth experiences and projects during my journey as an engineer.
					</p>
				</div>
				<div className="w-full h-px bg-zinc-800" />

				<div className="grid grid-cols-1 gap-8 mx-auto lg:grid-cols-2 ">
					<Card>
						<Link href={`/blog/${featured.slug}`}>
							<article className="relative h-full w-full p-4 md:p-8">
								<div className="flex justify-between gap-2 items-center">
									<div className="text-xs text-zinc-100">
										{featured.date ? (
											<time dateTime={new Date(featured.date).toISOString()}>
												{Intl.DateTimeFormat(undefined, {
													dateStyle: "medium",
												}).format(new Date(featured.date))}
											</time>
										) : (
											<span>SOON</span>
										)}
									</div>
								</div>

								<h2
									id="featured-post"
									className="mt-4 text-3xl font-bold  text-zinc-100 group-hover:text-white sm:text-4xl font-display"
								>
									{featured.title}
								</h2>
								<p className="mt-4 leading-8 duration-150 text-zinc-400 group-hover:text-zinc-300">
									{featured.description}
								</p>
								<div className="absolute bottom-4 md:bottom-8">
									<Link
										className="text-zinc-200 hover:text-zinc-50 hidden lg:block"
										href={`/blog/${featured.slug}`}
									>
										Read more <span aria-hidden="true">&rarr;</span>
									</Link>
								</div>
							</article>
						</Link>
					</Card>

					<div className="flex flex-col w-full gap-8  mx-auto border-t border-gray-900/10  lg:mx-0  lg:border-t-0 ">
						{[top2, top3].map((post) => (
							<Card key={post.slug}>
								<Article post={post} />
							</Card>
						))}
					</div>
				</div>
				<div className="hidden w-full h-px md:block bg-zinc-800" />

				<div className="grid  grid-cols-1 gap-4 mx-auto lg:mx-0 md:grid-cols-3">
					<div className="grid grid-cols-1 gap-4">
						{all
							.filter((_, i) => i % 3 === 0)
							.map((post) => (
								<Card key={post.slug}>
									<Article post={post} />
								</Card>
							))}
					</div>
					<div className="grid grid-cols-1 gap-4">
						{all
							.filter((_, i) => i % 3 === 1)
							.map((post) => (
								<Card key={post.slug}>
									<Article post={post} />
								</Card>
							))}
					</div>
					<div className="grid grid-cols-1 gap-4">
						{all
							.filter((_, i) => i % 3 === 2)
							.map((post) => (
								<Card key={post.slug}>
									<Article post={post} />
								</Card>
							))}
					</div>
				</div>
			</div>
		</div>
	);
}
