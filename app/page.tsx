import Link from "next/link";
import React from "react";

const navigation = [
  { name: "Engineer Journey", href: "/blog" },
  { name: "Contact", href: "/contact" },
];

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center w-screen h-screen overflow-hidden bg-gradient-to-tl from-black via-zinc-600/20 to-black">
      <nav className="my-16 animate-fade-in">
        <ul className="flex items-center justify-center gap-4">
          {navigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm duration-500 text-zinc-500 hover:text-zinc-300 border p-2 rounded border-zinc-800 hover:border-zinc-300"
            >
              {item.name}
            </Link>
          ))}
        </ul>
      </nav>
      <div className="hidden w-screen h-px animate-glow md:block animate-fade-left bg-gradient-to-r from-zinc-300/0 via-zinc-300/50 to-zinc-300/0" />

      <div className="flex space-x-4 md:space-x-8">
        <img
          src="https://avatars.githubusercontent.com/u/1764424?v=4"
          className="rounded-full h-9 md:h-32 overflow-hidden duration-500 animate-title bg-clip-text"
        />
        <h1 className="z-10 text-4xl text-transparent duration-500 cursor-default text-edge-outline animate-title font-display sm:text-6xl md:text-9xl whitespace-nowrap bg-clip-text bg-white">
          starptech
        </h1>
      </div>

      <div className="hidden w-screen h-px animate-glow md:block animate-fade-right bg-gradient-to-r from-zinc-300/0 via-zinc-300/50 to-zinc-300/0" />
      <div className="flex flex-col mx-4 md:mx-0 my-16 text-center animate-fade-in">
        <h2 className="text-zinc-500 leading-relaxed text-sm md:text-md md:max-w-2xl text-center">
        Hi, my name is Dustin, I'm founder and Tech Lead at{" "}
          <Link
            target="_blank"
            href="https://wundergraph.com"
            className="duration-500 whitespace-nowrap font-mono text-zinc-400 hover:text-zinc-300 after:content-['_↗'] after:text-sm after:font-bold px-1 after:relative after:top-[-2px] after:right-[2px]"
          >
            WunderGraph
          </Link>
        </h2>
        <h3 className="text-zinc-500 leading-relaxed text-sm md:text-md max-w-2xl text-center">
        We're building the{" "}
          <Link
            target="_blank"
            href="https://samnewman.io/patterns/architectural/bff/"
            className="duration-500 whitespace-nowrap text-zinc-400 font-mono hover:text-zinc-300 after:content-['_↗'] after:text-sm after:font-bold px-1 after:relative after:top-[-2px] after:right-[2px]"
          >
            backend for frontend
          </Link>{" "}
          framework. Empower your developers to streamline their integration
          workflows to provide a unified data layer for all frontend frameworks.
        </h3>
      </div>
    </div>
  );
}
