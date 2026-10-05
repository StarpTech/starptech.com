/* Light on the painting: four-point glints that flicker on the warm, bright
   parts of the image (stars, gold surf), and a slow sheen that travels across
   them. Where to sparkle is read from the painting's own pixels.

   The walker in each painting is a quiet door: click them to step into the
   other painting. */

type Spot = { x: number; y: number; r: number; g: number; b: number };
type Glint = Spot & { born: number; life: number; size: number };
type Art = "1" | "2";

/* The walkers in each painting: bounding box and traced silhouette, both in
   the painting's own pixels (1000 × 2000). */
type Walker = { box: [number, number, number, number]; outline: string };
const WALKERS: Record<Art, Walker[]> = {
  "1": [
    {
      box: [229.3, 1097, 8.9, 27.5],
      outline:
        "M234 1097 L235.5 1097.5 L235.8 1100 L237 1102.5 L238 1106.2 L238.2 1111.2 L236.8 1112.5 L235.2 1113.8 L235 1118.8 L234.8 1123.8 L233.2 1124.5 L232.2 1122.5 L232 1117.5 L230.6 1113.8 L229.3 1111.2 L229.4 1106.2 L230.8 1102.5 L233.2 1100.5 L233.2 1098.2 Z",
    },
    {
      box: [249.5, 1873, 9.5, 38.2],
      outline:
        "M253.5 1873 L254.8 1873.5 L255 1875.8 L254.5 1878 L256.8 1879.2 L258.2 1882 L259 1887 L259 1890.8 L257.5 1892.2 L256.8 1893.2 L257 1900.8 L256.5 1908.2 L255.5 1911 L254 1911.2 L253.5 1908.2 L252.8 1902 L251.8 1897 L251 1893.2 L249.8 1890.8 L249.5 1885.8 L250 1880.8 L251.8 1878.5 L252.8 1877.8 L252.5 1875.5 L252.8 1873.5 Z",
    },
  ],
  "2": [
    {
      box: [410.5, 712, 32.5, 109.5],
      outline:
        "M426.5 712 L431 714 L432.5 718.5 L431.8 723.5 L430 726 L435 728 L440.5 731 L442.5 737.5 L443 746.2 L441.5 753.8 L441 762.5 L440.2 772.5 L438.2 774.5 L438.5 767.5 L439 782.5 L437 800 L435 807.5 L434.5 815 L435 819.5 L431.5 821.5 L429 817.5 L428.5 805 L428 796.2 L427 805 L426 812.5 L426.5 818.5 L423.5 820 L421.5 817.5 L420 807.5 L418.5 795 L417 780 L416.5 765 L416 762.5 L414.5 772.5 L412.5 774 L411 767.5 L410.5 755 L411 743.8 L412.5 735 L415.5 729.5 L421 726 L422 724 L421 719.5 L422 714 Z",
    },
  ],
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
  const gems = [...document.querySelectorAll<HTMLButtonElement>("[data-shore-gem]")];

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

  // a walker's box inside the (untransformed) frame, in CSS pixels
  function walkerBox(walker: Walker) {
    const [bx, by, bw, bh] = walker.box;
    const w = frameEl.offsetWidth;
    const h = frameEl.offsetHeight;
    const [px, py] = getComputedStyle(img)
      .objectPosition.split(" ")
      .map((v) => (v.endsWith("%") ? parseFloat(v) / 100 : 0.5));
    const k = Math.max(w / img.naturalWidth, h / img.naturalHeight);
    const left = (w - img.naturalWidth * k) * px + bx * k;
    const top = (h - img.naturalHeight * k) * py + by * k;
    return { left, top, width: bw * k, height: bh * k, x: left + (bw * k) / 2, y: top + (bh * k) / 2 };
  }

  /* Keep each door on its walker, through the frame's slow drift, in the
     same coordinate space as the painting (fixed beside the page, or
     scrolling with the band). The traced outline sits exactly on their
     silhouette. A walker cropped out of view, or lost in the faded edge,
     gets no door. */
  function placeGems() {
    if (!img.naturalWidth) return;
    const walkers = WALKERS[art];
    const box = frameEl.getBoundingClientRect();
    const drift = box.width / frameEl.offsetWidth;
    const fixed = getComputedStyle(root).position === "fixed";
    const frameHeight = frameEl.offsetHeight;

    gems.forEach((gem, index) => {
      const walker = walkers[index];
      const local = walker && walkerBox(walker);
      if (!walker || !local || local.y < 0 || local.y > frameHeight * 0.95) {
        gem.hidden = true;
        return;
      }

      const fx = box.left + local.left * drift;
      const fy = box.top + local.top * drift;
      const fw = local.width * drift;
      const fh = local.height * drift;
      const gw = Math.max(fw + 12, 40);
      const gh = Math.max(fh + 12, 52);
      const gx = fx + fw / 2 - gw / 2;
      const gy = fy + fh / 2 - gh / 2;

      gem.style.position = fixed ? "fixed" : "absolute";
      gem.style.width = `${gw}px`;
      gem.style.height = `${gh}px`;
      gem.style.left = `${gx}px`;
      gem.style.top = `${gy + (fixed ? 0 : window.scrollY)}px`;

      const outline = gem.querySelector<SVGSVGElement>(".shore-gem__outline");
      if (outline) {
        const key = `${art}:${index}`;
        if (outline.dataset.walker !== key) {
          const [bx, by, bw, bh] = walker.box;
          outline.setAttribute("viewBox", `${bx} ${by} ${bw} ${bh}`);
          outline.querySelectorAll("path").forEach((path) => path.setAttribute("d", walker.outline));
          outline.dataset.walker = key;
        }
        outline.style.left = `${fx - gx}px`;
        outline.style.top = `${fy - gy}px`;
        outline.style.width = `${fw}px`;
        outline.style.height = `${fh}px`;
      }
      gem.hidden = false;
    });
  }

  const wait = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

  /* Step through the walker: the other painting opens outward from them,
     then quietly takes the place of the current one. */
  let swapping = false;
  async function swap(index: number) {
    if (swapping) return;
    swapping = true;
    const origin = walkerBox(WALKERS[art][index] ?? WALKERS[art][0]);
    gems.forEach((gem) => (gem.hidden = true));
    document.dispatchEvent(new CustomEvent("shore:step"));

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

  gems.forEach((gem, index) => gem.addEventListener("click", () => swap(index)));

  /* A clue to the door: shortly after the painting is up, the walker's
     outline traces once, softly, then fades. Only until the visitor has
     stepped through once (the remembered painting says they have), never
     in a background tab, and never under reduced motion. */
  function hint() {
    if (reducedMotion.matches) return;
    try {
      if (localStorage.getItem(STORAGE_KEY)) return;
    } catch {}
    if (document.visibilityState === "hidden") {
      document.addEventListener("visibilitychange", hint, { once: true });
      return;
    }

    window.setTimeout(() => {
      const gem = gems.find((candidate) => !candidate.hidden);
      if (!gem || swapping || gem.matches(":hover")) return;
      const stop = () => gem.classList.remove("is-hinting");
      // keyframe names are minified, so match the element: the outline's
      // fade is the longest part of the hint
      gem.addEventListener("animationend", (event) => {
        if ((event.target as Element).classList.contains("shore-gem__outline")) stop();
      });
      gem.addEventListener("pointerenter", stop, { once: true });
      gem.classList.add("is-hinting");
    }, 1600);
  }

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
    if (!swapping) placeGems();

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
    placeGems();
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
      placeGems();
    },
    { passive: true },
  );
  reducedMotion.addEventListener("change", start);
  ready().then(hint);
}
