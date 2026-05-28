const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

function reveal(block: HTMLElement) {
  const items = block.querySelectorAll<HTMLElement>(
    ".viz-node, .viz-card, .viz-tier, .viz-pool, .viz-step, .viz-stat, .viz-router-core, .viz-worker",
  );

  items.forEach((item, index) => {
    item.animate(
      [
        { opacity: 0, transform: "translateY(8px)" },
        { opacity: 1, transform: "translateY(0)" },
      ],
      {
        duration: 380,
        delay: index * 55,
        easing: "ease-out",
        fill: "both",
      },
    );
  });
}

function play(block: HTMLElement) {
  if (block.dataset.vizPlayed === "true") return;
  block.dataset.vizPlayed = "true";
  block.classList.add("is-active");

  if (reduceMotion.matches) return;
  reveal(block);
}

function initInferenceVisualizations() {
  const blocks = document.querySelectorAll<HTMLElement>("[data-inference-viz]");
  if (blocks.length === 0) return;

  if (!("IntersectionObserver" in window)) {
    blocks.forEach(play);
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        play(entry.target as HTMLElement);
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.28, rootMargin: "0px 0px -12% 0px" },
  );

  blocks.forEach((block) => observer.observe(block));
}

if (document.readyState !== "loading") initInferenceVisualizations();
else document.addEventListener("DOMContentLoaded", initInferenceVisualizations);
