/* Light on the painting: four-point glints that flicker on the warm, bright
   parts of the image (stars, gold surf), and a slow sheen that travels across
   them. Where to sparkle is read from the painting's own pixels.

   The walker in each painting is a quiet door: click them to step into the
   other painting. */

type Spot = { x: number; y: number; r: number; g: number; b: number };
type Glint = Spot & { born: number; life: number; size: number };
type Art = "1" | "2";

// where the walker stands in each painting, in image fractions
const WALKERS: Record<Art, { x: number; y: number; h: number }> = {
  "1": { x: 0.233, y: 0.555, h: 0.016 },
  "2": { x: 0.427, y: 0.383, h: 0.055 },
};
const STORAGE_KEY = "shore-art";

const root = document.querySelector<HTMLElement>("[data-shore-art]");
if (root) initShoreArt(root);

function initShoreArt(root: HTMLElement) {
  const img = root.querySelector<HTMLImageElement>(".shore-art__img")!;
  const canvas = root.querySelector<HTMLCanvasElement>(".shore-art__light")!;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const frameEl = root.querySelector<HTMLElement>(".shore-art__frame")!;
  const next = root.querySelector<HTMLImageElement>(".shore-art__next");
  const gem = document.querySelector<HTMLButtonElement>("[data-shore-gem]");

  let art: Art = "2";
  try {
    if (localStorage.getItem(STORAGE_KEY) === "1") art = "1";
  } catch {}

  function applyArt() {
    root.dataset.art = art;
    img.dataset.art = art;
    const src = art === "2" ? img.dataset.srcTwo : img.dataset.srcOne;
    if (src && !img.src.endsWith(src)) img.src = src;
  }
  applyArt();

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let spots: Spot[] = [];
  let sheenMask: HTMLCanvasElement | null = null;
  const sheen = document.createElement("canvas");
  const sheenCtx = sheen.getContext("2d")!;
  const glints: Glint[] = [];
  let ratio = 1;
  let rect = { x: 0, y: 0, w: 0, h: 0 };
  let frame = 0;
  let visible = true;

  /* Read the painting once at low resolution: warm, bright pixels become
     glint candidates and the alpha of the sheen mask. */
  function sample() {
    const W = 250;
    const H = Math.round((W * img.naturalHeight) / img.naturalWidth);
    const probe = document.createElement("canvas");
    probe.width = W;
    probe.height = H;
    const pctx = probe.getContext("2d", { willReadFrequently: true })!;
    pctx.drawImage(img, 0, 0, W, H);
    const data = pctx.getImageData(0, 0, W, H);

    const mask = document.createElement("canvas");
    mask.width = W;
    mask.height = H;
    const mctx = mask.getContext("2d")!;
    const maskData = mctx.createImageData(W, H);

    spots = [];
    for (let i = 0; i < W * H; i++) {
      const r = data.data[i * 4];
      const g = data.data[i * 4 + 1];
      const b = data.data[i * 4 + 2];
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      const warmth = (r - b) / 255;
      const glow = Math.max(0, Math.min(1, (lum - 110) / 120)) * Math.max(0, Math.min(1, warmth * 2.4));
      maskData.data[i * 4] = 255;
      maskData.data[i * 4 + 1] = 228;
      maskData.data[i * 4 + 2] = 180;
      maskData.data[i * 4 + 3] = Math.round(glow * 255);
      if (glow > 0.45) spots.push({ x: (i % W) / W, y: Math.floor(i / W) / H, r, g, b });
    }
    mctx.putImageData(maskData, 0, 0);
    sheenMask = mask;
    sheen.width = W;
    sheen.height = H;
  }

  // where the image actually lands inside the frame (object-fit: cover)
  function layout() {
    // offset size ignores the drift transform on the frame
    const box = { width: canvas.offsetWidth, height: canvas.offsetHeight };
    ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(box.width * ratio);
    canvas.height = Math.round(box.height * ratio);

    const [px, py] = getComputedStyle(img)
      .objectPosition.split(" ")
      .map((v) => (v.endsWith("%") ? parseFloat(v) / 100 : 0.5));
    const scale = Math.max(box.width / img.naturalWidth, box.height / img.naturalHeight);
    const w = img.naturalWidth * scale;
    const h = img.naturalHeight * scale;
    rect = {
      x: (box.width - w) * px * ratio,
      y: (box.height - h) * py * ratio,
      w: w * ratio,
      h: h * ratio,
    };
  }

  function spawn(now: number) {
    const spot = spots[Math.floor(Math.random() * spots.length)];
    const rare = Math.random() < 0.12;
    glints.push({
      ...spot,
      born: now,
      life: 900 + Math.random() * 2200,
      size: (rare ? 9 + Math.random() * 8 : 2.5 + Math.random() * 5) * ratio,
    });
  }

  function drawGlint(glint: Glint, alpha: number) {
    const x = rect.x + glint.x * rect.w;
    const y = rect.y + glint.y * rect.h;
    const s = glint.size;
    const tint = `${Math.min(255, glint.r + 40)},${Math.min(255, glint.g + 30)},${Math.min(255, glint.b + 10)}`;

    const core = ctx!.createRadialGradient(x, y, 0, x, y, s * 0.9);
    core.addColorStop(0, `rgba(255,251,240,${alpha})`);
    core.addColorStop(0.22, `rgba(${tint},${alpha * 0.55})`);
    core.addColorStop(1, `rgba(${tint},0)`);
    ctx!.fillStyle = core;
    ctx!.fillRect(x - s, y - s, s * 2, s * 2);

    const thin = Math.max(1, ratio * 0.8);
    const across = ctx!.createLinearGradient(x - s * 2.4, y, x + s * 2.4, y);
    across.addColorStop(0, `rgba(${tint},0)`);
    across.addColorStop(0.5, `rgba(255,248,230,${alpha * 0.9})`);
    across.addColorStop(1, `rgba(${tint},0)`);
    ctx!.fillStyle = across;
    ctx!.fillRect(x - s * 2.4, y - thin / 2, s * 4.8, thin);

    const down = ctx!.createLinearGradient(x, y - s * 3.2, x, y + s * 3.2);
    down.addColorStop(0, `rgba(${tint},0)`);
    down.addColorStop(0.5, `rgba(255,248,230,${alpha * 0.9})`);
    down.addColorStop(1, `rgba(${tint},0)`);
    ctx!.fillStyle = down;
    ctx!.fillRect(x - thin / 2, y - s * 3.2, thin, s * 6.4);
  }

  function drawSheen(now: number) {
    if (!sheenMask) return;
    const W = sheen.width;
    const H = sheen.height;
    const period = 11000;
    const k = (now % period) / period;
    const center = -0.35 + k * 1.7;

    sheenCtx.globalCompositeOperation = "source-over";
    sheenCtx.clearRect(0, 0, W, H);
    const band = sheenCtx.createLinearGradient(0, H * (center - 0.25), W * 0.35, H * (center + 0.25));
    band.addColorStop(0, "rgba(255,255,255,0)");
    band.addColorStop(0.5, "rgba(255,255,255,0.75)");
    band.addColorStop(1, "rgba(255,255,255,0)");
    sheenCtx.fillStyle = band;
    sheenCtx.fillRect(0, 0, W, H);
    sheenCtx.globalCompositeOperation = "destination-in";
    sheenCtx.drawImage(sheenMask, 0, 0);

    ctx!.globalAlpha = 0.55;
    ctx!.drawImage(sheen, rect.x, rect.y, rect.w, rect.h);
    ctx!.globalAlpha = 1;
  }

  // the walker's position inside the (untransformed) frame, in CSS pixels
  function walkerPoint() {
    const walker = WALKERS[art];
    const w = frameEl.offsetWidth;
    const h = frameEl.offsetHeight;
    const [px, py] = getComputedStyle(img)
      .objectPosition.split(" ")
      .map((v) => (v.endsWith("%") ? parseFloat(v) / 100 : 0.5));
    const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight);
    const iw = img.naturalWidth * scale;
    const ih = img.naturalHeight * scale;
    return {
      x: (w - iw) * px + walker.x * iw,
      y: (h - ih) * py + walker.y * ih,
      height: walker.h * ih,
    };
  }

  /* Keep the door on the walker, through the frame's slow drift, in the same
     coordinate space as the painting (fixed beside the page, or scrolling
     with the band). */
  function placeGem() {
    if (!gem || !img.naturalWidth) return;
    const point = walkerPoint();
    const box = frameEl.getBoundingClientRect();
    const drift = box.width / frameEl.offsetWidth;
    const x = box.left + point.x * drift;
    const y = box.top + point.y * drift;
    const size = Math.max(40, point.height * drift * 1.4);

    const fixed = getComputedStyle(root).position === "fixed";
    gem.style.position = fixed ? "fixed" : "absolute";
    gem.style.width = `${size * 0.7}px`;
    gem.style.height = `${size}px`;
    gem.style.left = `${x - size * 0.35}px`;
    gem.style.top = `${y - size / 2 + (fixed ? 0 : window.scrollY)}px`;
    gem.hidden = false;
  }

  const wait = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

  /* Step through the walker: the other painting opens outward from them,
     then quietly takes the place of the current one. */
  let swapping = false;
  async function swap() {
    if (swapping) return;
    swapping = true;
    if (gem) gem.hidden = true;

    const nextArt: Art = art === "2" ? "1" : "2";
    try {
      localStorage.setItem(STORAGE_KEY, nextArt);
    } catch {}

    if (reducedMotion.matches || !next) {
      art = nextArt;
      applyArt();
      glints.length = 0;
      await ready();
      swapping = false;
      return;
    }

    const origin = walkerPoint();
    frameEl.style.setProperty("--rx", `${origin.x}px`);
    frameEl.style.setProperty("--ry", `${origin.y}px`);
    next.dataset.art = nextArt;
    next.src = (nextArt === "2" ? img.dataset.srcTwo : img.dataset.srcOne) ?? "";
    try {
      await next.decode();
    } catch {}

    const w = frameEl.offsetWidth;
    const h = frameEl.offsetHeight;
    const reach = Math.hypot(Math.max(origin.x, w - origin.x), Math.max(origin.y, h - origin.y)) + 160;
    next.style.setProperty("--reveal", "0px");
    void next.offsetWidth;
    root.classList.add("is-revealing");
    next.style.setProperty("--reveal", `${reach}px`);
    await wait(1800);

    // the revealed painting becomes the painting, without a visible seam
    root.classList.add("is-settling");
    art = nextArt;
    applyArt();
    try {
      await img.decode();
    } catch {}
    // decoded is not painted: give the new bitmap two frames on screen
    // before the reveal layer goes, or the old painting flashes through
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    root.classList.remove("is-revealing");
    next.style.removeProperty("--reveal");
    void img.offsetWidth;
    root.classList.remove("is-settling");

    glints.length = 0;
    await ready();
    swapping = false;
  }

  gem?.addEventListener("click", swap);

  function render(now: number) {
    ctx!.clearRect(0, 0, canvas.width, canvas.height);
    ctx!.globalCompositeOperation = "lighter";
    drawSheen(now);

    const target = canvas.width > 900 ? 46 : 28;
    while (spots.length && glints.length < target) spawn(now - Math.random() * 1500);
    for (let i = glints.length - 1; i >= 0; i--) {
      const age = (now - glints[i].born) / glints[i].life;
      if (age >= 1) {
        glints.splice(i, 1);
        continue;
      }
      if (age > 0) drawGlint(glints[i], Math.pow(Math.sin(Math.PI * age), 2));
    }
    ctx!.globalCompositeOperation = "source-over";
    if (!swapping) placeGem();

    if (visible) frame = requestAnimationFrame(render);
  }

  function start() {
    cancelAnimationFrame(frame);
    if (reducedMotion.matches || !spots.length) {
      ctx!.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }
    frame = requestAnimationFrame(render);
  }

  async function ready() {
    try {
      await img.decode();
    } catch {
      return;
    }
    sample();
    layout();
    placeGem();
    start();
  }

  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible) start();
  }).observe(root);
  window.addEventListener(
    "resize",
    () => {
      layout();
      placeGem();
    },
    { passive: true },
  );
  reducedMotion.addEventListener("change", start);
  ready();
}
