// Writing pages: a painted night sky at the top of the page. A blue nebula
// rises through the right margin, dusted with pale stars, and warm orange
// stars scatter around it, thinning with distance. One bright star burns near
// the top of the band. Drawn once (seeded, so it never jumps between visits)
// and redrawn only when the width changes.

type RGB = readonly [number, number, number];

const NEBULA: RGB[] = [
  [40, 50, 150],
  [48, 64, 178],
  [62, 82, 210],
  [84, 104, 232],
];
const CORE: RGB = [126, 146, 245];
const DUST: RGB = [206, 218, 255];
const EMBERS: RGB[] = [
  [255, 172, 98],
  [242, 142, 72],
  [255, 202, 144],
  [222, 122, 62],
];

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rgba = ([r, g, b]: RGB, a: number) => `rgb(${r} ${g} ${b} / ${a})`;

function glow(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: RGB, a: number) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, rgba(color, a));
  g.addColorStop(0.45, rgba(color, a * 0.45));
  g.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
}

function dot(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: RGB, a: number) {
  ctx.fillStyle = rgba(color, a);
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

// the eased ramp the style guide asks for, as alpha stops from 1 to 0
function easedStops(g: CanvasGradient, from: number, to: number) {
  for (let i = 0; i <= 8; i++) {
    const t = i / 8;
    const s = t * t * (3 - 2 * t);
    g.addColorStop(from + (to - from) * t, `rgb(0 0 0 / ${1 - s})`);
  }
}

function paint(canvas: HTMLCanvasElement) {
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  if (w === 0 || h === 0) return;

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);

  const rand = mulberry32(0x5eed);
  const gauss = () => (rand() + rand() + rand() - 1.5) / 1.5;
  const s = Math.min(1.1, Math.max(0.55, w / 1440));

  // keep the nebula in the right margin beside the text column when there
  // is room; on narrow screens it leans against the right edge
  const column = Math.min(704, w - 40);
  const columnRight = (w + column) / 2;
  const axisX = w >= 1100 ? columnRight + (w - columnRight) * 0.5 : w * 0.84;
  const tilt = -0.05 * w * s;
  const phase = rand() * Math.PI * 2;
  const axis = (t: number) =>
    axisX + tilt * t + Math.sin(t * 5 + phase) * 22 * s + Math.sin(t * 13) * 8 * s;
  const width = (t: number) => s * (50 + 80 * Math.pow(Math.sin(Math.PI * Math.min(1, t * 1.15)), 0.8));
  const top = -0.06 * h;
  const span = 0.86 * h;

  ctx.globalCompositeOperation = "lighter";

  // the nebula: clumps of soft cloud along a wandering axis, so it reads as
  // a painted wisp rather than a beam; thin at the top, fullest low down
  const strength = (t: number) => Math.min(1, t * 4) * (0.55 + 0.45 * Math.sin(Math.PI * t));
  for (let c = 0; c < 18; c++) {
    const ct = rand();
    const cx = axis(ct) + gauss() * width(ct) * 0.6;
    const cy = top + ct * span;
    const size = s * (30 + rand() * 60);
    const count = 10 + Math.floor(rand() * 16);
    for (let i = 0; i < count; i++) {
      const x = cx + gauss() * size * 1.1;
      const y = cy + gauss() * size * 1.6;
      const color = NEBULA[Math.floor(rand() * NEBULA.length)];
      glow(ctx, x, y, s * (16 + rand() * 46), color, (0.018 + rand() * 0.03) * strength(ct));
    }
  }

  // a faint veil that ties the clumps together
  for (let i = 0; i < 120; i++) {
    const t = rand();
    const x = axis(t) + gauss() * width(t) * 0.8;
    const y = top + t * span + gauss() * 30 * s;
    glow(ctx, x, y, s * (30 + rand() * 70), NEBULA[Math.floor(rand() * 2)], (0.012 + rand() * 0.02) * strength(t));
  }

  // a brighter core low in the band
  for (let i = 0; i < 40; i++) {
    const t = 0.4 + rand() * 0.35;
    const x = axis(t) + gauss() * width(t) * 0.3;
    glow(ctx, x, top + t * span, s * (10 + rand() * 26), CORE, 0.015 + rand() * 0.02);
  }

  // dark lanes so the cloud reads as dust, not a gradient
  ctx.globalCompositeOperation = "destination-out";
  for (let i = 0; i < 60; i++) {
    const t = rand();
    const x = axis(t) + gauss() * width(t) * 0.9;
    glow(ctx, x, top + t * span, s * (10 + rand() * 34), [0, 0, 0], 0.15 + rand() * 0.25);
  }

  ctx.globalCompositeOperation = "lighter";

  // pale star dust packed into the nebula
  for (let i = 0; i < 700 * s; i++) {
    const t = rand();
    const x = axis(t) + gauss() * width(t) * 0.5;
    dot(ctx, x, top + t * span, 0.35 + rand() * 0.5, DUST, (0.08 + rand() * 0.35) * strength(t));
  }

  // warm stars everywhere, thickest around the nebula
  const reach = 260 * s;
  const candidates = (w * h) / 1500;
  for (let i = 0; i < candidates; i++) {
    const x = rand() * w;
    const y = rand() * h;
    const t = Math.min(1, Math.max(0, (y - top) / span));
    const d = (x - axis(t)) / reach;
    if (rand() > 0.14 + 0.86 * Math.exp(-d * d)) continue;

    const ember = EMBERS[Math.floor(rand() * EMBERS.length)];
    const big = rand() < 0.07;
    const r = big ? 1.5 + rand() * 1.1 : 0.45 + rand() * 0.9;
    const a = big ? 0.75 : 0.25 + rand() * 0.55;
    if (big) glow(ctx, x, y, r * 4.5, ember, 0.18);
    dot(ctx, x, y, r, ember, a);
  }

  // the bright star near the top of the band, with a faint four-point flare
  const sx = axis(0.24) + 6 * s;
  const sy = top + 0.24 * span;
  glow(ctx, sx, sy, 30 * s, [242, 142, 72], 0.26);
  glow(ctx, sx, sy, 8 * s, [255, 188, 120], 0.85);
  dot(ctx, sx, sy, 1.6 * s, [255, 226, 190], 0.9);
  for (const [dx, dy, len] of [
    [1, 0, 15],
    [0, 1, 19],
  ] as const) {
    const l = len * s;
    const g = ctx.createLinearGradient(sx - dx * l, sy - dy * l, sx + dx * l, sy + dy * l);
    g.addColorStop(0, "rgb(255 190 120 / 0)");
    g.addColorStop(0.5, "rgb(255 206 150 / 0.7)");
    g.addColorStop(1, "rgb(255 190 120 / 0)");
    ctx.strokeStyle = g;
    ctx.lineWidth = 1.1 * s;
    ctx.beginPath();
    ctx.moveTo(sx - dx * l, sy - dy * l);
    ctx.lineTo(sx + dx * l, sy + dy * l);
    ctx.stroke();
  }

  // dissolve into the page before the writing starts
  ctx.globalCompositeOperation = "destination-in";
  const fade = ctx.createLinearGradient(0, 0, 0, h);
  easedStops(fade, 0.18, 1);
  ctx.fillStyle = fade;
  ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = "source-over";

  canvas.classList.add("is-painted");
}

function initNightSky() {
  const canvas = document.querySelector<HTMLCanvasElement>("[data-night-sky]");
  if (!canvas) return;

  let painted = { w: 0, h: 0 };
  const repaint = () => {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    // mobile toolbars nudge the height while scrolling; ignore small changes
    if (w === painted.w && Math.abs(h - painted.h) < 60) return;
    painted = { w, h };
    paint(canvas);
  };

  repaint();
  let frame = 0;
  new ResizeObserver(() => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(repaint);
  }).observe(canvas);
}

initNightSky();
