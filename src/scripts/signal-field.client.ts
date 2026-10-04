/* Night shore — a single full-screen shader behind the homepage.
   Sky with aurora ribbons and four-point starlight, a glowing horizon with
   island silhouettes, and bioluminescent wave fronts rolling onto a moonlit
   shore. Plain WebGL2, one draw call, no scene graph. */

const canvas = document.getElementById("signalField") as HTMLCanvasElement | null;

const vertexSource = /* glsl */ `#version 300 es
void main() {
  // one oversized triangle that covers the viewport
  vec2 p = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2);
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

const fragmentSource = /* glsl */ `#version 300 es
precision highp float;

uniform vec2 uRes;
uniform float uTime;
uniform float uLight;
uniform vec2 uPointer;

out vec4 outColor;

const float HORIZON = -0.03;
const float PI = 3.14159265;

float AA;

float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

vec2 hash22(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.xx + p3.yz) * p3.zy);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash12(i), hash12(i + vec2(1.0, 0.0)), u.x),
    mix(hash12(i + vec2(0.0, 1.0)), hash12(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p = mat2(1.6, 1.2, -1.2, 1.6) * p + vec2(17.1, 9.2);
    a *= 0.5;
  }
  return v;
}

/* Light is added at night and painted on at dawn, so one scene serves both
   themes. */
void glow(inout vec3 col, vec3 c, float a) {
  vec3 night = col + c * a;
  vec3 dawn = mix(col, c * 0.72, clamp(a, 0.0, 1.0) * 0.5);
  col = mix(night, dawn, uLight);
}

vec3 pick(vec3 night, vec3 dawn) {
  return mix(night, dawn, uLight);
}

float sdSegment(vec2 p, vec2 a, vec2 b) {
  vec2 pa = p - a;
  vec2 ba = b - a;
  return length(pa - ba * clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0));
}

// four-point starlight: soft core plus long, thin cross spikes
float glint(vec2 d, float size, float stretch) {
  vec2 a = abs(d);
  float core = exp(-length(d) / (size * 0.14));
  float halo = exp(-length(d) / (size * 0.6)) * 0.18;
  float spikes =
    exp(-a.x / (size * 0.025)) * exp(-a.y / (size * stretch)) +
    exp(-a.y / (size * 0.025)) * exp(-a.x / size);
  return core + halo + spikes * 0.8;
}

vec3 starTint(float h) {
  if (h < 0.4) return vec3(0.9, 0.93, 1.0);
  if (h < 0.62) return vec3(1.0, 0.82, 0.58);
  if (h < 0.82) return vec3(1.0, 0.62, 0.82);
  return vec3(0.55, 1.0, 0.92);
}

// ---------------------------------------------------------------- sky ----

vec3 sky(vec2 p, float t) {
  float sy = clamp((p.y - HORIZON) / (0.5 - HORIZON), 0.0, 1.0);
  vec3 col = mix(
    pick(vec3(0.06, 0.11, 0.3), vec3(0.97, 0.9, 0.86)),
    pick(vec3(0.015, 0.025, 0.09), vec3(0.84, 0.86, 0.95)),
    smoothstep(0.0, 0.9, sy)
  );

  // painted ribbons: a domain-warped flow with brush striations along it
  vec2 q = vec2(p.x * 0.85 + t * 0.005, p.y * 1.5);
  vec2 warp = vec2(
    fbm(q * 1.3 + vec2(0.0, t * 0.01)),
    fbm(q * 1.3 + vec2(5.2, 1.3) - t * 0.008)
  );
  float flow = fbm(vec2(q.x * 1.1 + warp.x * 1.9, q.y * 4.2 + warp.y * 2.6));
  float strokes = 0.62 + 0.38 * noise(vec2(p.x * 2.4 + warp.x * 5.0, p.y * 85.0 + warp.y * 14.0));
  float ribbons = smoothstep(0.32, 0.72, flow) * smoothstep(0.22, 0.8, sy);
  vec3 violet = pick(vec3(0.34, 0.2, 0.86), vec3(0.7, 0.64, 0.92));
  vec3 magenta = pick(vec3(0.82, 0.2, 0.5), vec3(0.92, 0.62, 0.74));
  vec3 coral = pick(vec3(1.0, 0.45, 0.36), vec3(0.98, 0.72, 0.62));
  vec3 ribbon = mix(violet, magenta, smoothstep(0.35, 0.75, warp.x));
  ribbon = mix(ribbon, coral, smoothstep(0.66, 0.92, flow) * 0.7);
  glow(col, ribbon, ribbons * strokes * 1.05);
  // nebulous colour beneath the ribbons so the sky never reads as flat
  float haze = fbm(p * 2.2 + warp * 1.5);
  glow(col, mix(violet, magenta, haze) * 0.5, haze * haze * smoothstep(0.1, 0.9, sy) * 0.55);

  // a faint milky band crossing the sky
  float band = exp(-pow((p.y - 0.18 - p.x * 0.22) * 6.0, 2.0));
  glow(col, pick(vec3(0.22, 0.3, 0.6), vec3(0.8, 0.82, 0.92)), band * fbm(p * 6.0 + 3.0) * 0.22);

  glow(col, pick(vec3(0.08, 0.55, 0.6), vec3(0.55, 0.82, 0.86)), exp(-sy * 11.0) * 0.6);
  glow(col, pick(vec3(0.3, 0.14, 0.42), vec3(0.85, 0.72, 0.86)), exp(-sy * 3.5) * 0.2);
  return col;
}

vec3 stars(vec2 p, float t) {
  vec3 col = vec3(0.0);

  for (int l = 0; l < 3; l++) {
    float fl = float(l);
    float scale = mix(190.0, 60.0, fl * 0.5);
    vec2 g = p * scale;
    vec2 id = floor(g);
    float h = hash12(id + fl * 31.7);
    if (h > mix(0.86, 0.95, fl * 0.5)) {
      vec2 o = (hash22(id) - 0.5) * 0.7;
      float d = length(fract(g) - 0.5 - o);
      float tw = 0.55 + 0.45 * sin(t * (0.8 + h * 2.6) + h * 40.0);
      col += smoothstep(0.16, 0.0, d) * tw * mix(0.45, 1.0, fl * 0.5) * starTint(hash12(id + 7.0));
    }
  }

  float scale = 7.0;
  vec2 g = p * scale;
  vec2 id = floor(g);
  for (int j = -1; j <= 1; j++) {
    for (int i = -1; i <= 1; i++) {
      vec2 c = id + vec2(float(i), float(j));
      float h = hash12(c * 1.7 + 3.1);
      if (h < 0.84) continue;
      vec2 d = (g - c - hash22(c)) / scale;
      float size = mix(0.012, 0.05, pow(hash12(c + 11.0), 3.0));
      float tw = 0.7 + 0.3 * sin(t * (0.5 + h) + h * 20.0);
      col += glint(d, size, 1.3) * tw * starTint(hash12(c + 5.0));
    }
  }
  return col;
}

// the bright stars again, as shimmering columns on the water
vec3 starReflections(vec2 p, float t) {
  vec3 col = vec3(0.0);
  float scale = 7.0;
  float cx = floor(p.x * scale);
  float cy = floor(HORIZON * scale);
  for (int i = -1; i <= 1; i++) {
    for (int j = 0; j < 4; j++) {
      vec2 c = vec2(cx + float(i), cy + float(j));
      float h = hash12(c * 1.7 + 3.1);
      if (h < 0.84) continue;
      vec2 sp = (c + hash22(c)) / scale;
      if (sp.y < HORIZON + 0.04) continue;
      float size = mix(0.012, 0.05, pow(hash12(c + 11.0), 3.0));
      float depth = HORIZON - p.y;
      float width = 0.0015 + size * 0.1 + depth * 0.012;
      float shimmer = smoothstep(0.4, 0.85, noise(vec2(sp.x * 60.0, p.y * 150.0 + t * 0.9)));
      float column = exp(-abs(p.x - sp.x) / width) * shimmer * exp(-depth * 5.0);
      col += starTint(hash12(c + 5.0)) * column * size * 26.0;
    }
  }
  return col;
}

// --------------------------------------------------------------- palms ----

/* One frond: a drooping rachis with comb-like leaflets that sweep toward
   the tip. Returns coverage. */
float frond(vec2 p, vec2 c, float ang, float len, float droop, float arch, float seed) {
  vec2 dir = vec2(cos(ang), sin(ang));
  vec2 nrm = vec2(-dir.y, dir.x);
  vec2 q = p - c;
  float u = dot(q, dir);
  float s = u / len;
  if (s < 0.0 || s > 1.0) return 0.0;
  vec2 spine = c + dir * u + nrm * (arch * s * (1.0 - s) * len) - vec2(0.0, droop * s * s * len);
  float v = dot(p - spine, nrm);
  float av = abs(v);

  float rachis = len * 0.01 * (1.0 - s * 0.7);
  float cov = smoothstep(rachis + AA, rachis - AA, av);

  float leafLen = len * 0.23 * pow(sin(PI * clamp(s * 1.08, 0.0, 1.0)), 0.75) * smoothstep(0.0, 0.08, s);
  if (av < leafLen + AA) {
    float spacing = len * 0.032;
    float m = fract((u - av * 1.1) / spacing + seed);
    float halfW = 0.33 * (1.0 - 0.6 * av / max(leafLen, 1e-4));
    float aaCell = AA / spacing;
    float leaf = smoothstep(halfW + aaCell, halfW - aaCell, abs(m - 0.5));
    leaf *= smoothstep(leafLen + AA, leafLen - AA, av);
    // a few torn leaflets
    leaf *= step(0.12, hash12(vec2(floor((u - av * 1.1) / spacing + seed), seed + sign(v))));
    cov = max(cov, leaf);
  }
  return cov;
}

float crown(vec2 p, vec2 c, float len, float seed, float t) {
  if (length(p - c) > len * 1.25) return 0.0;
  float cov = smoothstep(len * 0.05 + AA, len * 0.05 - AA, length(p - c - vec2(0.0, -len * 0.035)));
  for (int i = 0; i < 13; i++) {
    float fi = float(i);
    float h = hash12(vec2(fi, seed));
    float a = mix(-0.32 * PI, 1.32 * PI, fi / 12.0) + (h - 0.5) * 0.3;
    a += sin(t * 0.55 + fi * 1.3 + seed) * 0.025;
    float hang = 0.5 - 0.5 * sin(a); // fronds pointing sideways and down hang more
    cov = max(cov, frond(p, c, a, len * (0.78 + 0.32 * h), 0.22 + 0.4 * hang + h * 0.1, 0.12, fi * 3.7 + seed));
  }
  return cov;
}

float trunk(vec2 p, vec2 base, vec2 top, float bend, float w0, float w1) {
  vec2 ax = top - base;
  float len = length(ax);
  vec2 dir = ax / len;
  vec2 nrm = vec2(-dir.y, dir.x);
  vec2 q = p - base;
  float along = dot(q, dir);
  float k = clamp(along / len, 0.0, 1.0);
  float off = dot(q, nrm) - bend * sin(k * PI) * len;
  float w = mix(w0, w1, k) * (1.0 + 0.14 * smoothstep(0.7, 0.95, fract(k * len * 34.0)));
  return smoothstep(w + AA, w - AA, abs(off)) * step(0.0, along) * step(along, len);
}

float foregroundPalms(vec2 p, float aspect, float t) {
  float ex = aspect * 0.5;
  float sc = clamp(aspect * 0.62, 0.55, 1.15);
  if (abs(p.x) < ex - 0.52 * sc) return 0.0;
  float lift = mix(0.4, 0.29, smoothstep(0.6, 1.3, aspect));

  float cov = 0.0;
  vec2 cl = vec2(-ex + 0.1 * sc, lift);
  cov = max(cov, trunk(p, vec2(-ex - 0.07, -0.62), cl, 0.08, 0.026 * sc, 0.013 * sc));
  cov = max(cov, crown(p, cl, 0.31 * sc, 1.0, t));

  vec2 cr1 = vec2(ex - 0.14 * sc, lift - 0.1);
  vec2 cr2 = vec2(ex - 0.01 * sc, lift + 0.07);
  cov = max(cov, trunk(p, vec2(ex + 0.03, -0.62), cr1, -0.08, 0.027 * sc, 0.013 * sc));
  cov = max(cov, trunk(p, vec2(ex + 0.12, -0.62), cr2, -0.05, 0.024 * sc, 0.012 * sc));
  cov = max(cov, crown(p, cr1, 0.28 * sc, 2.0, t));
  cov = max(cov, crown(p, cr2, 0.25 * sc, 3.0, t));
  return cov;
}

float islandHeight(float x, float aspect) {
  float right = smoothstep(0.12 * aspect, 0.36 * aspect, x);
  float left = smoothstep(-0.2 * aspect, -0.4 * aspect, x);
  float canopy = fbm(vec2(x * 7.0, 1.3)) * 0.035 + noise(vec2(x * 60.0, 7.0)) * 0.007;
  return right * (0.022 + canopy) + left * (0.016 + canopy * 0.7);
}

float distantPalms(vec2 p, float aspect, float t) {
  if (p.y > HORIZON + 0.12) return 0.0;
  float cov = 0.0;
  for (int i = 0; i < 5; i++) {
    float fi = float(i);
    float side = i < 3 ? 1.0 : -1.0;
    float x = side * aspect * (0.3 + fi * 0.035 - (side < 0.0 ? 0.05 : 0.0));
    float h = 0.045 + hash12(vec2(fi, 9.0)) * 0.035;
    vec2 base = vec2(x, HORIZON + islandHeight(x, aspect) - 0.004);
    vec2 top = base + vec2(-side * 0.008, h);
    if (abs(p.x - top.x) > h * 0.7) continue;
    cov = max(cov, trunk(p, base, top, 0.05 * side, 0.0016, 0.001));
    cov = max(cov, crown(p, top, h * 0.45, fi + 9.0, t));
  }
  return cov;
}

float figure(vec2 p, vec2 feet, float h, float lean) {
  float d = sdSegment(p, feet + vec2(-0.09 * h, 0.0), feet + vec2(-0.04 * h, 0.46 * h)) - 0.05 * h;
  d = min(d, sdSegment(p, feet + vec2(0.08 * h, 0.0), feet + vec2(0.04 * h, 0.46 * h)) - 0.05 * h);
  d = min(d, sdSegment(p, feet + vec2(0.0, 0.46 * h), feet + vec2(lean * h, 0.8 * h)) - 0.12 * h);
  d = min(d, length(p - feet - vec2(lean * h * 1.15, 0.93 * h)) - 0.075 * h);
  return d;
}

float shoreline(float x) {
  return -0.36 + 0.03 * sin(x * 2.1 + 0.4) + 0.014 * sin(x * 5.3 - 1.0);
}

// ---------------------------------------------------------------- main ----

void main() {
  vec2 frag = gl_FragCoord.xy;
  vec2 p = (frag - 0.5 * uRes) / uRes.y;
  float aspect = uRes.x / uRes.y;
  float t = uTime;
  AA = 1.1 / uRes.y;
  vec3 col;

  vec2 sp = p + vec2(uPointer.x * 0.01, uPointer.y * 0.006);
  float s = shoreline(p.x);

  if (p.y >= HORIZON) {
    col = sky(sp, t);
    float sy = (p.y - HORIZON) / (0.5 - HORIZON);
    glow(col, stars(sp, t), smoothstep(0.02, 0.25, sy) * (1.0 - uLight * 0.75));

    // shooting stars
    float period = 11.0;
    float k = floor(t / period);
    float local = t - k * period;
    if (local < 1.2) {
      vec2 a = vec2((hash12(vec2(k, 1.0)) - 0.5) * aspect * 0.9, 0.3 + hash12(vec2(k, 2.0)) * 0.16);
      vec2 dir = normalize(vec2(-1.0, -0.45));
      float prog = local / 1.2;
      vec2 rel = sp - (a + dir * prog * 0.5);
      float along = dot(rel, -dir);
      float across = length(rel + dir * along);
      float trail = smoothstep(0.25, 0.0, along) * step(0.0, along) * exp(-across * 1100.0);
      glow(col, vec3(0.9, 0.95, 1.0), (trail + exp(-length(rel) * 300.0)) * sin(prog * PI));
    }

    // distant islands
    float ih = islandHeight(p.x, aspect);
    vec3 land = pick(vec3(0.008, 0.02, 0.03), vec3(0.58, 0.64, 0.68));
    col = mix(col, land, distantPalms(p, aspect, t));
    if (p.y < HORIZON + ih) {
      col = land * (0.75 + 0.25 * noise(p * 160.0));
      glow(col, pick(vec3(0.1, 0.35, 0.4), vec3(0.85, 0.9, 0.92)), exp(-(HORIZON + ih - p.y) * 300.0) * 0.4);
    }
  } else if (p.y > s) {
    // ---- sea ----------------------------------------------------------------
    float u = clamp((p.y - s) / (HORIZON - s), 0.0, 0.999);
    float w = -log(1.0 - u * 0.985);
    float wx = p.x / (HORIZON - p.y + 0.03) * 0.12;

    vec3 shallow = pick(vec3(0.03, 0.2, 0.27), vec3(0.6, 0.82, 0.84));
    vec3 deep = pick(vec3(0.015, 0.07, 0.16), vec3(0.74, 0.84, 0.9));
    vec3 far = pick(vec3(0.04, 0.22, 0.3), vec3(0.8, 0.9, 0.92));
    col = mix(shallow, deep, smoothstep(0.0, 1.5, w));
    col = mix(col, far, smoothstep(2.3, 4.1, w));

    // horizontal brushwork
    float stroke = fbm(vec2(p.x * 2.0 + wx * 0.2, p.y * 120.0));
    col *= mix(0.78 + 0.4 * stroke, 1.0, uLight * 0.7);

    glow(col, starReflections(sp, t), 1.0 - uLight * 0.8);

    // wave fronts rolling in
    float warp = (fbm(vec2(wx * 0.45, w * 0.3 - t * 0.02)) - 0.5) * 1.6;
    float phase = (w + t * 0.1) * 1.75 + warp;
    float fp = fract(phase);
    float fw = fwidth(phase);
    float crestId = floor(phase);
    float strength = 0.5 + 0.5 * hash12(vec2(crestId, 2.0));
    float broken = smoothstep(0.2, 0.62, noise(vec2(wx * 1.3, crestId * 3.7)));
    float foamTex = 0.55 + 0.45 * noise(vec2(wx * 9.0, phase * 4.0));
    float sharp = 1.0 - smoothstep(0.0, fw * 1.6 + 0.024, min(fp, 1.0 - fp));
    float echo = 1.0 - smoothstep(0.0, fw * 1.2 + 0.009, abs(fp - 0.1));
    float trailGlow = exp(-fp * 5.0);
    float fade = smoothstep(3.9, 0.7, w);
    vec3 crestColor = mix(
      pick(vec3(1.0, 0.66, 0.28), vec3(0.82, 0.55, 0.26)),
      pick(vec3(0.55, 0.95, 1.0), vec3(0.22, 0.58, 0.68)),
      smoothstep(1.2, 3.2, w)
    );
    vec3 wake = mix(pick(vec3(0.7, 0.42, 0.18), vec3(0.85, 0.65, 0.4)), pick(vec3(0.1, 0.55, 0.62), vec3(0.4, 0.66, 0.78)), smoothstep(0.8, 2.6, w));
    glow(col, wake, trailGlow * broken * fade * strength * 0.5);
    glow(col, crestColor, (sharp * 2.3 * foamTex + echo * 0.6) * broken * fade * strength);

    // glints riding the swell
    float gs = 34.0;
    vec2 g = p * gs;
    vec2 gid = floor(g);
    for (int j = -1; j <= 1; j++) {
      for (int i = -1; i <= 1; i++) {
        vec2 c = gid + vec2(float(i), float(j));
        float h = hash12(c + 91.0);
        if (h < 0.78) continue;
        vec2 d = (g - c - hash22(c + 4.0)) / gs;
        float size = mix(0.005, 0.017, pow(hash12(c + 13.0), 2.0)) * (1.0 - u * 0.6);
        float tw = max(0.0, sin(t * (1.2 + h * 2.0) + h * 30.0));
        float near = 0.15 + (sharp * 1.5 + exp(-fp * 4.0)) * broken * strength;
        glow(col, pick(vec3(1.0, 0.84, 0.58), vec3(0.85, 0.6, 0.3)), glint(d, size, 2.4) * tw * near * fade * 0.8);
      }
    }

    glow(col, pick(vec3(0.6, 0.95, 1.0), vec3(0.4, 0.7, 0.78)), exp(-abs(p.y - HORIZON) * 260.0) * 0.55);
  } else {
    // ---- sand ---------------------------------------------------------------
    float grain = noise(frag * 0.8) * 0.4 + fbm(p * vec2(9.0, 30.0)) * 0.6;
    float toWater = smoothstep(-0.5, s, p.y);
    col = mix(
      pick(vec3(0.12, 0.13, 0.19), vec3(0.9, 0.87, 0.82)),
      pick(vec3(0.34, 0.42, 0.48), vec3(0.95, 0.93, 0.88)),
      grain * 0.35 + toWater * toWater * 0.65
    );
    // ripples combed into the sand by the backwash
    float ripples = sin((p.y - s) * 260.0 + fbm(p * vec2(6.0, 2.0)) * 9.0);
    col *= 1.0 + ripples * 0.05 * (1.0 - uLight * 0.5);
    // wet sand mirrors the water
    float wet = smoothstep(0.045, 0.0, s - p.y);
    col = mix(col, pick(vec3(0.04, 0.16, 0.22), vec3(0.76, 0.84, 0.86)), wet * 0.75);
    glow(col, starReflections(vec2(sp.x, 2.0 * s - p.y + HORIZON - 0.02), t), wet * 0.5 * (1.0 - uLight));

    // glitter
    vec2 gg = frag / 3.0;
    float gh = hash12(floor(gg));
    float sparkle = step(0.975, gh) * max(0.0, sin(t * (1.0 + gh * 4.0) + gh * 50.0));
    glow(col, pick(vec3(0.8, 0.95, 1.0), vec3(0.85, 0.7, 0.45)), sparkle * 0.7 * (0.4 + toWater));

    // two small figures by the water
    if (aspect > 0.9) {
      float fx = aspect * 0.29;
      vec2 feet = vec2(fx, shoreline(fx) - 0.05);
      float h = 0.05;
      float d = min(figure(p, feet, h, 0.03), figure(p, feet + vec2(0.024, 0.002), h * 1.08, -0.04));
      glow(col, pick(vec3(0.35, 0.8, 0.9), vec3(0.6, 0.8, 0.85)), exp(-max(d, 0.0) * 120.0) * 0.35);
      col = mix(col, pick(vec3(0.02, 0.03, 0.05), vec3(0.3, 0.34, 0.4)), smoothstep(AA, -AA, d));
    }
  }

  // swash: foam where the water meets the sand
  float swash = s + 0.007 * sin(t * 0.45 + p.x * 3.0) - 0.004;
  float foam = exp(-abs(p.y - swash) * 280.0) * (0.5 + 0.5 * noise(vec2(p.x * 40.0, t * 0.3)));
  glow(col, pick(vec3(0.75, 0.97, 1.0), vec3(0.4, 0.66, 0.74)), foam * 0.9);

  // foreground palms frame the scene
  float palms = foregroundPalms(p, aspect, t);
  vec3 ink = pick(vec3(0.006, 0.01, 0.025), vec3(0.42, 0.47, 0.54));
  ink += pick(vec3(0.01, 0.02, 0.02), vec3(0.04)) * noise(p * 40.0);
  col = mix(col, ink, palms);

  // painterly finish: soft tone curve, canvas weave, grain, vignette
  vec3 toned = 1.0 - exp(-col * 1.35);
  col = mix(toned, col, uLight);
  float weave = sin(frag.x * 1.9) * sin(frag.y * 1.9);
  float canvasTex = 0.94 + 0.04 * weave + 0.06 * noise(frag * 0.35);
  col *= mix(canvasTex, 1.0 - (1.0 - canvasTex) * 0.6, uLight);
  float vig = 1.0 - 0.5 * dot(p * vec2(0.5, 1.0), p * vec2(0.5, 1.0));
  col = mix(col * vig, col, uLight);

  col += (hash12(frag + fract(t) * 100.0) - 0.5) / 255.0;
  outColor = vec4(col, 1.0);
}`;

function compile(gl: WebGL2RenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.warn(gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function initNightShore(canvas: HTMLCanvasElement) {
  const gl = canvas.getContext("webgl2", {
    alpha: false,
    antialias: false,
    depth: false,
    powerPreference: "low-power",
  });
  if (!gl) return;

  const vertex = compile(gl, gl.VERTEX_SHADER, vertexSource);
  const fragment = compile(gl, gl.FRAGMENT_SHADER, fragmentSource);
  if (!vertex || !fragment) return;

  const program = gl.createProgram();
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.warn(gl.getProgramInfoLog(program));
    return;
  }
  gl.useProgram(program);
  gl.bindVertexArray(gl.createVertexArray());

  const uRes = gl.getUniformLocation(program, "uRes");
  const uTime = gl.getUniformLocation(program, "uTime");
  const uLight = gl.getUniformLocation(program, "uLight");
  const uPointer = gl.getUniformLocation(program, "uPointer");

  const root = document.documentElement;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const smallViewport = window.matchMedia("(max-width: 640px)").matches;
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  let width = 0;
  let animationFrame = 0;

  function syncTheme() {
    gl!.uniform1f(uLight, root.dataset.theme === "dark" ? 0 : 1);
  }

  function resize() {
    const nextWidth = window.innerWidth;
    /* Mobile browser chrome changes innerHeight while scrolling; resizing for
       that height-only change makes the horizon jump. */
    if (smallViewport && width > 1 && Math.abs(nextWidth - width) < 2) return;
    width = nextWidth;

    const rect = canvas.getBoundingClientRect();
    // keep the per-frame pixel count modest on large, dense screens
    let ratio = Math.min(window.devicePixelRatio || 1, smallViewport ? 1.5 : 1.35);
    const budget = 2_600_000;
    if (rect.width * rect.height * ratio * ratio > budget) {
      ratio = Math.sqrt(budget / (rect.width * rect.height));
    }
    canvas.width = Math.max(1, Math.round(rect.width * ratio));
    canvas.height = Math.max(1, Math.round(rect.height * ratio));
    gl!.viewport(0, 0, canvas.width, canvas.height);
    gl!.uniform2f(uRes, canvas.width, canvas.height);
    if (reducedMotion.matches) draw(0);
  }

  function draw(now: number) {
    pointer.x += (pointer.tx - pointer.x) * 0.04;
    pointer.y += (pointer.ty - pointer.y) * 0.04;
    gl!.uniform1f(uTime, reducedMotion.matches ? 21 : now * 0.001);
    gl!.uniform2f(uPointer, pointer.x, pointer.y);
    gl!.drawArrays(gl!.TRIANGLES, 0, 3);
  }

  function loop(now: number) {
    draw(now);
    animationFrame = requestAnimationFrame(loop);
  }

  function restart() {
    cancelAnimationFrame(animationFrame);
    if (reducedMotion.matches) draw(0);
    else animationFrame = requestAnimationFrame(loop);
  }

  window.addEventListener(
    "pointermove",
    (event) => {
      if (event.pointerType === "touch") return;
      pointer.tx = (event.clientX / window.innerWidth - 0.5) * 2;
      pointer.ty = (event.clientY / window.innerHeight - 0.5) * -2;
    },
    { passive: true },
  );
  window.addEventListener("resize", resize, { passive: true });
  reducedMotion.addEventListener("change", restart);
  new MutationObserver(() => {
    syncTheme();
    if (reducedMotion.matches) draw(0);
  }).observe(root, { attributes: true, attributeFilter: ["data-theme"] });

  syncTheme();
  resize();
  restart();
}

if (canvas) initNightShore(canvas);
