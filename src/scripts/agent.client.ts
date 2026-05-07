/**
 * Minimal client script — only theme toggle.
 */

function currentTheme(): "dark" | "light" {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

function syncLabel() {
  const button = document.getElementById("themeToggle");
  if (!button) return;
  const next = currentTheme() === "dark" ? "light" : "dark";
  button.setAttribute("aria-label", `Switch to ${next} mode`);
}

function setTheme(next: "dark" | "light") {
  if (next === "light") {
    delete document.documentElement.dataset.theme;
  } else {
    document.documentElement.dataset.theme = next;
  }
  try {
    localStorage.setItem("theme", next);
  } catch {}
  syncLabel();
}

function toggleTheme() {
  setTheme(currentTheme() === "dark" ? "light" : "dark");
}

/* -- console signature for devtools openers ------------------------------- */
function consoleSignature() {
  // pull live theme colors so the message matches dark/light
  const root = getComputedStyle(document.documentElement);
  const accent = root.getPropertyValue("--accent").trim() || "#2563eb";
  const muted = root.getPropertyValue("--muted").trim() || "#737373";
  const mono =
    "'Geist Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";

  console.log(
    "%c\n  / dustin deus\n  ─────────────\n" +
      "%c  You opened devtools. Hi.\n" +
      "  Built with Astro + Geist. No tracking. No cookies. No JS framework.\n\n" +
      "%c  Say hi → deusdustin@gmail.com\n",
    `color: ${accent}; font-weight: 700; font-size: 14px; font-family: ${mono}; line-height: 1.6;`,
    `color: ${muted}; font-size: 12px; font-family: ${mono}; line-height: 1.6;`,
    `color: ${accent}; font-weight: 600; font-size: 12px; font-family: ${mono}; line-height: 1.6;`,
  );
}

/* -- "Copy as Markdown" buttons ------------------------------------------- */
function initCopyMarkdown() {
  const buttons = document.querySelectorAll<HTMLButtonElement>("[data-copy-md]");
  buttons.forEach((btn) => {
    const url = btn.dataset.mdUrl;
    if (!url) return;
    const label = btn.querySelector<HTMLElement>("[data-copy-label]");
    const original = label?.textContent ?? "Copy as Markdown";
    let resetTimer = 0;

    btn.addEventListener("click", async () => {
      window.clearTimeout(resetTimer);
      try {
        const res = await fetch(url, { credentials: "same-origin" });
        if (!res.ok) throw new Error(`fetch failed: ${res.status}`);
        const text = await res.text();
        await navigator.clipboard.writeText(text);
        if (label) label.textContent = "Copied";
        btn.classList.add("is-copied");
      } catch (err) {
        console.warn("[copy] failed:", err);
        if (label) label.textContent = "Failed — try again";
      }
      resetTimer = window.setTimeout(() => {
        if (label) label.textContent = original;
        btn.classList.remove("is-copied");
      }, 1800);
    });
  });
}

function init() {
  syncLabel();
  document.getElementById("themeToggle")?.addEventListener("click", toggleTheme);
  initCopyMarkdown();
  consoleSignature();
}

if (document.readyState !== "loading") init();
else document.addEventListener("DOMContentLoaded", init);
