/**
 * The brush: everything the film paints with. Seeded noise, strokes, washes, mountains, pines,
 * paper, mist, petals. Nothing here reads a clock or an unseeded random number.
 */
export const W = 1080, H = 1920, PI = Math.PI, TAU = Math.PI * 2;

export function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const smooth = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };
export const lerp = (a, b, k) => a + (b - a) * k;
export const mod = (a, n) => ((a % n) + n) % n;
export const ramp = (t, a, b) => smooth((t - a) / (b - a));
export function cv(w = W, h = H) { const c = new OffscreenCanvas(w, h); return { c, g: c.getContext("2d") }; }

export const PAPER = "#efe6d2", VERM = "#c8361f", VERM_D = "#8e2312";
export const INK = ["#0f0d0b", "#1f1b17", "#342e28", "#4d463e", "#6b6359", "#8a8175", "#a79e90", "#c2b9a9"];

function makeNoise(seed) {
  const r = seeded(seed), g = new Float32Array(256), p = new Uint8Array(512), a = [];
  for (let i = 0; i < 256; i++) { g[i] = r(); a.push(i); }
  for (let i = 255; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const s = a[i]; a[i] = a[j]; a[j] = s; }
  for (let i = 0; i < 512; i++) p[i] = a[i & 255];
  const n = (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const X = xi & 255, Y = yi & 255, A = g[p[p[X] + Y]], B = g[p[p[X + 1] + Y]], C = g[p[p[X] + Y + 1]], D = g[p[p[X + 1] + Y + 1]];
    return A + (B - A) * u + (C - A) * v + (A - B - C + D) * u * v;
  };
  n.fbm = (x, y, o = 4) => { let s = 0, amp = 0.5, f = 1, tot = 0; for (let k = 0; k < o; k++) { s += n(x * f, y * f) * amp; tot += amp; amp *= 0.5; f *= 2.03; } return s / tot; };
  return n;
}
export const NZ = makeNoise(7);

/** Catmull-Rom through the points: a brush moves in curves, never in corners. */
export function spline(P, step = 6, closed = false) {
  const out = [], n = P.length, get = (i) => (closed ? P[mod(i, n)] : P[clamp(i, 0, n - 1)]), segs = closed ? n : n - 1;
  for (let i = 0; i < segs; i++) {
    const p0 = get(i - 1), p1 = get(i), p2 = get(i + 1), p3 = get(i + 2);
    const m = Math.max(2, Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / step));
    for (let j = 0; j < m; j++) {
      const u = j / m, u2 = u * u, u3 = u2 * u;
      out.push([
        0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * u + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * u2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * u3),
        0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * u + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * u2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * u3),
      ]);
    }
  }
  if (!closed) out.push([P[n - 1][0], P[n - 1][1]]);
  return out;
}
/** Rock is not smooth: break every straight run with small seeded steps. */
export function craggy(P, amp, seed, step = 13) {
  const out = [];
  for (let i = 0; i < P.length - 1; i++) {
    const a = P[i], b = P[i + 1], d = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, m = Math.max(1, Math.round(d / step)), nx = -(b[1] - a[1]) / d, ny = (b[0] - a[0]) / d;
    for (let j = 0; j < m; j++) { const u = j / m, e = Math.sin(PI * u), k = (NZ.fbm(i * 3.7 + u * d * 0.03 + seed, seed * 1.3, 3) - 0.5) * 2 * amp * e + (NZ(i * 9.1 + u * d * 0.16, seed) - 0.5) * amp * 0.5 * e; out.push([lerp(a[0], b[0], u) + nx * k, lerp(a[1], b[1], u) + ny * k]); }
  }
  out.push(P[P.length - 1].slice(0, 2));
  return out;
}
export function trace(g, pts, closed) { g.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]); if (closed) g.closePath(); }
export function blob(g, P, step = 5) { g.beginPath(); trace(g, spline(P, step, true), true); }
export function rpoly(g, pts, rad = 5) {
  const n = pts.length, a = pts[n - 1], b = pts[0];
  g.beginPath(); g.moveTo((a[0] + b[0]) / 2, (a[1] + b[1]) / 2);
  for (let i = 0; i < n; i++) { const p = pts[i], q = pts[(i + 1) % n]; g.arcTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2, p[2] ?? rad); }
  g.closePath();
}
/** A stroke with its own width along the way: wf(s) is the half-width at s in 0..1. Leaves the path ready for fill(). */
export function ribbon(g, pts, wf) {
  const n = pts.length, len = [0], L = [], R = [];
  for (let i = 1; i < n; i++) len[i] = len[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  const T = len[n - 1] || 1;
  for (let i = 0; i < n; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
    let dx = b[0] - a[0], dy = b[1] - a[1]; const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d;
    const h = wf(len[i] / T);
    L.push([pts[i][0] - dy * h, pts[i][1] + dx * h]); R.push([pts[i][0] + dy * h, pts[i][1] - dx * h]);
  }
  g.beginPath(); g.moveTo(L[0][0], L[0][1]);
  for (let i = 1; i < n; i++) g.lineTo(L[i][0], L[i][1]);
  for (let i = n - 1; i >= 0; i--) g.lineTo(R[i][0], R[i][1]);
  g.closePath();
}
/** A brush line that swells and thins as a hand would press and lift: the contour of a line-and-wash figure. */
export function contour(g, pts, w, seed = 0, color = INK[0], alpha = 0.9) {
  g.save(); g.fillStyle = color; g.globalAlpha = alpha;
  ribbon(g, pts, (s) => w * 0.5 * Math.pow(Math.sin(PI * clamp(s, 0.015, 0.985)), 0.42) * (0.42 + 1.05 * NZ(s * 5.5 + seed * 1.7, seed * 0.61 + 3)));
  g.fill(); g.restore();
}
/** Hair, a sash, a beard: a strand in the wind, written as a travelling wave so any second can be drawn alone. */
export function strand(x, y, ang, len, t, o = {}) {
  const n = o.n ?? 12, pts = [], amp = o.amp ?? 8, f = o.freq ?? 1.1, sp = o.speed ?? 5, ph = o.phase ?? 0, droop = o.droop ?? 0.12, cx = Math.cos(ang), sy = Math.sin(ang);
  for (let k = 0; k <= n; k++) {
    const s = k / n, wv = amp * Math.pow(s, 1.2) * Math.sin(f * s * TAU - sp * t + ph) + amp * 0.4 * s * Math.sin(f * 2.3 * s * TAU - sp * 1.7 * t + ph * 2);
    pts.push([x + cx * len * s - sy * wv, y + sy * len * s + cx * wv + droop * len * s * s]);
  }
  return pts;
}
export function polyY(pts, x) {
  for (let i = 1; i < pts.length; i++) if (x <= pts[i][0]) { const a = pts[i - 1], b = pts[i]; return lerp(a[1], b[1], clamp((x - a[0]) / (b[0] - a[0] || 1))); }
  return pts[pts.length - 1][1];
}

// ── Baked state, shared ─────────────────────────────────────────────────────
export const K = { PAT: {}, MIST: [], BOUGH: [], PETSPR: [], PETS: [] };

function tile(fn, size = 512) {
  const t = cv(size, size), id = t.g.createImageData(size, size);
  for (let y = 0, i = 0; y < size; y++) for (let x = 0; x < size; x++, i += 4) { const [r, g, b, a] = fn(x, y); id.data[i] = r; id.data[i + 1] = g; id.data[i + 2] = b; id.data[i + 3] = a; }
  t.g.putImageData(id, 0, 0);
  return t;
}
/** Noise that repeats every `size`, so a tile has no seam. */
const wrap = (f, size) => (x, y) => { const u = x / size, v = y / size; return lerp(lerp(f(x, y), f(x - size, y), u), lerp(f(x, y - size), f(x - size, y - size), u), v); };

/** A dry brush: many hairs, each with its own load of ink, skipping where the paper's tooth lifts them. */
export function dryStroke(g, pts, o) {
  const n = pts.length; if (n < 2) return;
  const len = new Float32Array(n), nx = new Float32Array(n), ny = new Float32Array(n);
  for (let i = 1; i < n; i++) len[i] = len[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  for (let i = 0; i < n; i++) { const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)]; const dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1; nx[i] = -dy / d; ny[i] = dx / d; }
  const L = len[n - 1] || 1, wf = typeof o.width === "function" ? o.width : () => o.width, wmax = Math.max(wf(0), wf(0.3), wf(0.6), wf(1));
  const B = Math.max(3, Math.round(wmax * (o.density ?? 0.8))), r = seeded((o.seed ?? 1) * 7919 + 13), dry = o.dry ?? 0.5, tin = o.tin ?? 0.08, tout = o.tout ?? 0.25, sd = (o.seed ?? 1) * 0.113, grainLen = o.grainLen ?? 0.028;
  g.save(); g.strokeStyle = o.color ?? INK[0]; g.lineCap = "round"; g.lineJoin = "round";
  for (let b = 0; b < B; b++) {
    const off = (B > 1 ? b / (B - 1) - 0.5 : 0) + (r() - 0.5) * 0.05, load = 0.3 + 0.7 * r(), ph = r() * 200;
    g.lineWidth = (0.8 + r() * 1.5) * (o.hair ?? 1);
    g.globalAlpha = (o.alpha ?? 0.8) * (0.45 + 0.55 * load);
    g.beginPath(); let on = false, any = false;
    for (let i = 0; i < n; i++) {
      const s = len[i] / L, prof = Math.min(1, s / tin, (1 - s) / tout), thr = dry * (0.18 + 0.6 * s) + (1 - load) * 0.18;
      if (prof > 0.03 && NZ(ph + len[i] * grainLen, b * 0.43 + sd) > thr) {
        const w = wf(s) * Math.sqrt(prof), x = pts[i][0] + nx[i] * off * w, y = pts[i][1] + ny[i] * off * w;
        if (on) g.lineTo(x, y); else { g.moveTo(x, y); on = true; } any = true;
      } else on = false;
    }
    if (any) g.stroke();
  }
  g.restore();
}
/** "Flying white": where the brush ran dry and the paper shows through the ink. */
export function feibai(g, pts, width, alpha, seed, sc = 1) {
  g.save(); g.globalCompositeOperation = "destination-out";
  dryStroke(g, pts, { width, color: "#000", alpha, dry: 0.92, seed, tin: 0.1, tout: 0.3, density: 0.55 * sc, hair: 1 / sc, grainLen: 0.05 * sc });
  g.restore();
}

/** A wet wash: soft edge, pooled pigment, a darker rim where it dried, granulation in the paper's tooth. */
export function wash(dst, path, o = {}) {
  const s = K.S1.g;
  s.setTransform(1, 0, 0, 1, 0, 0); s.globalCompositeOperation = "source-over"; s.globalAlpha = 1; s.filter = "none"; s.clearRect(0, 0, W, H);
  s.fillStyle = o.color ?? INK[3]; s.filter = `blur(${o.soft ?? 1.5}px)`; s.beginPath(); path(s); s.fill(); s.filter = "none";
  s.globalCompositeOperation = "source-atop";
  const r = seeded((o.seed ?? 5) * 31 + 1), [bx, by, bw, bh] = o.box ?? [0, 0, W, H], pool = o.pool ?? 0.25;
  if (pool > 0) for (let i = 0; i < (o.pools ?? 14); i++) {
    const x = bx + r() * bw, y = by + r() * bh, R = (0.06 + r() * 0.2) * Math.max(bw, bh), dark = r() < 0.6, gr = s.createRadialGradient(x, y, 0, x, y, R);
    gr.addColorStop(0, dark ? `rgba(15,13,11,${pool})` : `rgba(239,230,210,${pool * 0.9})`); gr.addColorStop(1, dark ? "rgba(15,13,11,0)" : "rgba(239,230,210,0)");
    s.fillStyle = gr; s.fillRect(x - R, y - R, 2 * R, 2 * R);
  }
  if ((o.rim ?? 0.35) > 0) { s.filter = "blur(1.4px)"; s.strokeStyle = o.rimColor ?? INK[0]; s.globalAlpha = o.rim ?? 0.35; s.lineWidth = o.rimW ?? 8; s.beginPath(); path(s); s.stroke(); s.filter = "none"; s.globalAlpha = 1; }
  if (o.inner) o.inner(s);
  if (o.fade) { const [x0, y0, x1, y1, a0, a1] = o.fade, gr = s.createLinearGradient(x0, y0, x1, y1); gr.addColorStop(0, `rgba(0,0,0,${a0})`); gr.addColorStop(1, `rgba(0,0,0,${a1})`); s.globalCompositeOperation = "destination-in"; s.fillStyle = gr; s.fillRect(0, 0, W, H); }
  if ((o.grain ?? 0.3) > 0) { s.globalCompositeOperation = "destination-out"; s.globalAlpha = o.grain ?? 0.3; s.fillStyle = K.PAT.grain; s.fillRect(0, 0, W, H); s.globalAlpha = 1; }
  s.globalCompositeOperation = "source-over";
  dst.save(); dst.globalAlpha = o.alpha ?? 0.7; dst.drawImage(K.S1.c, 0, 0); dst.restore();
}

function bakePaper() {
  const p = cv(), g = p.g;
  g.fillStyle = PAPER; g.fillRect(0, 0, W, H);
  const low = (rgb, fn) => { const m = cv(135, 240), id = m.g.createImageData(135, 240); for (let y = 0, i = 0; y < 240; y++) for (let x = 0; x < 135; x++, i += 4) { id.data[i] = rgb[0]; id.data[i + 1] = rgb[1]; id.data[i + 2] = rgb[2]; id.data[i + 3] = fn(x, y); } m.g.putImageData(id, 0, 0); return m; };
  g.imageSmoothingEnabled = true; g.imageSmoothingQuality = "high";
  g.drawImage(low([122, 100, 66], (x, y) => clamp((NZ.fbm(x * 0.022 + 9, y * 0.022 + 4, 4) - 0.44) * 1.8) * 60).c, 0, 0, W, H);
  g.drawImage(low([255, 252, 240], (x, y) => clamp((NZ.fbm(x * 0.03 + 40, y * 0.03 + 70, 4) - 0.46) * 1.9) * 120).c, 0, 0, W, H);
  const r = seeded(42);
  for (let i = 0; i < 3400; i++) {       // the fibres of the rice paper
    const x = r() * W, y = r() * H, len = 14 + r() * r() * 150, a = r() * TAU, bend = (r() - 0.5) * len * 0.7, light = r() < 0.58;
    g.strokeStyle = light ? `rgba(255,252,241,${0.2 + r() * 0.4})` : `rgba(116,94,62,${0.05 + r() * 0.13})`;
    g.lineWidth = 0.5 + r() * 1.2;
    g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + Math.cos(a) * len * 0.5 - Math.sin(a) * bend, y + Math.sin(a) * len * 0.5 + Math.cos(a) * bend, x + Math.cos(a) * len, y + Math.sin(a) * len); g.stroke();
  }
  g.globalCompositeOperation = "multiply";
  const v = g.createRadialGradient(W / 2, H * 0.45, H * 0.28, W / 2, H * 0.47, H * 0.74);
  v.addColorStop(0, "rgba(120,96,60,0)"); v.addColorStop(1, "rgba(120,96,60,0.34)");
  g.fillStyle = v; g.fillRect(0, 0, W, H);
  g.globalCompositeOperation = "source-over";
  return p;
}

function mistTex(seed) {
  const w = 384, h = 128, m = cv(w, h), id = m.g.createImageData(w, h);
  for (let y = 0, i = 0; y < h; y++) for (let x = 0; x < w; x++, i += 4) {
    const u = x / w, a = NZ.fbm(u * 5 + seed * 10, y * 0.028 + seed, 4), b = NZ.fbm((u - 1) * 5 + seed * 10, y * 0.028 + seed, 4);
    const n = a * (1 - u) + b * u, vy = Math.pow(Math.sin((PI * y) / (h - 1)), 1.4);
    id.data[i] = 245; id.data[i + 1] = 239; id.data[i + 2] = 225; id.data[i + 3] = clamp((n - 0.36) * 2.7) * vy * 255;
  }
  m.g.putImageData(id, 0, 0);
  return m;
}
/** A band of mist: two sheets of the same vapour sliding over each other, so the shapes open and close. */
export function mist(g, t, y, h, alpha, speed, k) {
  const draw = (tex, sp, sc, a, yo) => { const tw = W * sc, off = mod(t * sp + k * 371, tw); g.globalAlpha = a; g.drawImage(tex, -off, y + yo, tw, h); g.drawImage(tex, tw - off, y + yo, tw, h); };
  g.save(); g.imageSmoothingEnabled = true; g.imageSmoothingQuality = "high";
  draw(K.MIST[k % 3].c, speed, 1.8, alpha, 0);
  draw(K.MIST[(k + 1) % 3].c, -speed * 0.55, 2.4, alpha * 0.7, h * 0.12 * Math.sin(t * 0.4 + k));
  g.restore();
}
export function haze(g, y0, y1, a) {
  const gr = g.createLinearGradient(0, y0, 0, y1);
  gr.addColorStop(0, "rgba(243,236,221,0)"); gr.addColorStop(0.55, `rgba(243,236,221,${a})`); gr.addColorStop(1, "rgba(243,236,221,0)");
  g.fillStyle = gr; g.fillRect(0, y0, W, y1 - y0);
}
export function glow(g, x, y, r, a) {
  const gr = g.createRadialGradient(x, y, r * 0.6, x, y, r * 4.2);
  gr.addColorStop(0, `rgba(255,249,234,${a})`); gr.addColorStop(0.35, `rgba(255,246,226,${a * 0.45})`); gr.addColorStop(1, "rgba(255,246,226,0)");
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
}
export function sun(g, x, y, r, a, seed) {
  wash(g, (s) => { for (let i = 0; i <= 90; i++) { const q = (i / 90) * TAU, rr = r * (1 + 0.012 * Math.sin(q * 5 + seed) + 0.008 * Math.sin(q * 11)); i ? s.lineTo(x + Math.cos(q) * rr, y + Math.sin(q) * rr) : s.moveTo(x + Math.cos(q) * rr, y + Math.sin(q) * rr); } s.closePath(); },
    { color: VERM, alpha: a, soft: 1.6, rim: 0.4, rimW: r * 0.11, rimColor: VERM_D, grain: 0.22, pool: 0.16, pools: 9, seed, box: [x - r, y - r, 2 * r, 2 * r] });
}

/** A mountain as the brush leaves it: ink at the crest, thinning to nothing in the mist below. */
export function mountain(dst, o) {
  const { seed, base, height, peaks, pw = 220, tone = 4, alpha = 0.6, band = 220, rough = 14, strokes = 20, dots = 0, x0 = -90, x1 = W + 90 } = o;
  const r = seeded(seed * 977 + 3), pk = [];
  for (let i = 0; i < peaks; i++) {
    const c = lerp(x0, x1, (i + 0.15 + 0.7 * r()) / peaks), h = height * (0.4 + 0.6 * r()), w = pw * (0.6 + 0.9 * r());
    pk.push({ c, h, w, sk: (r() - 0.5) * 0.9, e: 1.05 + r() * 0.9 });
    pk.push({ c: c + (r() < 0.5 ? -1 : 1) * w * (0.35 + 0.3 * r()), h: h * (0.5 + 0.3 * r()), w: w * 0.45, sk: (r() - 0.5) * 0.9, e: 1 + r() * 0.8 });   // a shoulder beside each peak
  }
  for (const h of o.hero ?? []) pk.push({ e: 1.3, ...h });
  const yAt = (x) => {
    let y = 0;
    for (const p of pk) { let u = (x - p.c) / p.w; u = u < 0 ? u * (1 + p.sk) : u * (1 - p.sk); y = Math.max(y, p.h * Math.pow(Math.max(0, 1 - Math.abs(u)), p.e)); }
    const ridged = 1 - Math.abs(2 * NZ(x * 0.012 + seed * 3.3, seed * 0.7) - 1);
    return base - y - height * 0.12 * NZ.fbm(x * 0.004 + seed * 1.7, seed * 0.37, 3) - height * 0.1 * ridged * clamp(y / height + 0.25) - rough * (NZ.fbm(x * 0.045, seed * 5.1, 3) - 0.5) * 2;
  };
  const pts = []; for (let x = x0; x <= x1; x += 4) pts.push([x, yAt(x)]);
  const s = K.S1.g, dk = INK[Math.max(0, tone - 2)];
  s.setTransform(1, 0, 0, 1, 0, 0); s.globalCompositeOperation = "source-over"; s.globalAlpha = 1; s.filter = "none"; s.clearRect(0, 0, W, H);
  s.fillStyle = INK[tone]; s.filter = "blur(1.3px)"; s.beginPath(); s.moveTo(x0, H + 60); for (const p of pts) s.lineTo(p[0], p[1]); s.lineTo(x1, H + 60); s.closePath(); s.fill(); s.filter = "none";
  s.globalCompositeOperation = "source-atop";
  s.strokeStyle = dk; s.lineWidth = 14; s.globalAlpha = 0.5; s.filter = "blur(2.4px)"; s.beginPath(); trace(s, pts); s.stroke(); s.filter = "none"; s.globalAlpha = 1;
  for (let i = 0; i < strokes; i++) {       // texture strokes, dragged down the slopes
    const x = lerp(x0 + 40, x1 - 40, r()), y = yAt(x), slope = (yAt(x + 12) - yAt(x - 12)) / 24, dir = slope > 0 ? 1 : -1, Ls = band * (0.35 + 0.75 * r()), lean = 0.25 + 0.5 * r();
    const st = []; for (let k = 0; k <= 10; k++) { const u = k / 10; st.push([x + dir * lean * Ls * u * (0.6 + 0.4 * u), y + 3 + r() * 4 + Ls * u]); }
    dryStroke(s, st, { width: 5 + r() * 22, color: dk, alpha: 0.5, dry: 0.68, seed: seed * 31 + i, tin: 0.04, tout: 0.5 });
  }
  for (let i = 0; i < dots; i++) {          // moss dots: far trees on the crest
    const x = lerp(x0, x1, r()), y = yAt(x) + r() * 5;
    s.fillStyle = INK[Math.max(0, tone - 3)]; s.globalAlpha = 0.45 + 0.4 * r();
    s.beginPath(); s.ellipse(x, y - 3, 1.6 + r() * 2.6, 3 + r() * 7, (r() - 0.5) * 0.3, 0, TAU); s.fill();
  }
  s.globalAlpha = 1; s.globalCompositeOperation = "destination-out"; s.filter = `blur(${Math.round(band * 0.42)}px)`;
  s.beginPath(); s.moveTo(x0 - 300, H + 500); for (const p of pts) s.lineTo(p[0], p[1] + band); s.lineTo(x1 + 300, H + 500); s.closePath(); s.fill(); s.filter = "none";
  s.globalAlpha = o.grain ?? 0.26; s.fillStyle = K.PAT.grain; s.fillRect(0, 0, W, H);
  s.globalAlpha = 1; s.globalCompositeOperation = "source-over";
  dst.save(); dst.globalAlpha = alpha; dst.drawImage(K.S1.c, 0, 0); dst.restore();
  dryStroke(dst, pts, { width: 2.6 + (6 - tone) * 0.7, color: dk, alpha: alpha * 0.75, dry: 0.7, seed: seed + 2, tin: 0.01, tout: 0.01, density: 1.2 });   // the brush's first touch along the crest
  return yAt;
}

/** One fan of pine needles, and a bough made of them. */
function fan(g, x, y, R, dir, seed) {
  const r = seeded(seed * 53 + 7);
  g.save();
  g.fillStyle = INK[4]; g.globalAlpha = 0.2; g.filter = "blur(7px)"; g.beginPath(); g.ellipse(x + Math.cos(dir) * R * 0.4, y + Math.sin(dir) * R * 0.4, R * 0.95, R * 0.55, dir + PI / 2, 0, TAU); g.fill(); g.filter = "none";
  const n = 44; g.lineCap = "round";
  for (let i = 0; i < n; i++) {
    const a = dir + (i / (n - 1) - 0.5) * 2.7 + (r() - 0.5) * 0.09, L = R * (0.62 + 0.42 * r());
    g.strokeStyle = INK[r() < 0.75 ? 0 : 2]; g.globalAlpha = 0.5 + 0.45 * r(); g.lineWidth = 1.1 + r() * 1.5;
    g.beginPath(); g.moveTo(x + Math.cos(a) * R * 0.05, y + Math.sin(a) * R * 0.05);
    g.quadraticCurveTo(x + Math.cos(a + 0.07) * L * 0.6, y + Math.sin(a + 0.07) * L * 0.6, x + Math.cos(a) * L, y + Math.sin(a) * L); g.stroke();
  }
  g.restore();
}
function makeBough(seed) {      // pivot at (30, 250); the bough reaches to the right
  const b = cv(620, 420), g = b.g, r = seeded(seed * 17 + 5);
  const ctrl = [[30, 250], [140, 226 + r() * 20], [250, 240 + r() * 16], [360, 200 + r() * 24], [470, 208 + r() * 16], [570, 170 + r() * 20]], pts = spline(ctrl, 4);
  const twigs = [];
  for (let i = 0; i < 4; i++) { const p = pts[Math.floor((0.25 + 0.2 * i) * (pts.length - 1))], up = i % 2 ? -1 : 1, e = [p[0] + 50 + r() * 30, p[1] - up * (46 + r() * 34)]; twigs.push([p, [(p[0] + e[0]) / 2 + 6, (p[1] + e[1]) / 2 - up * 8], e]); }
  for (let i = 0; i < 8; i++) { const p = pts[Math.floor((0.12 + 0.88 * (i / 7)) * (pts.length - 1))]; fan(g, p[0] + (r() - 0.5) * 26, p[1] - 6 - r() * 16, 56 + r() * 40, -PI / 2 + (r() - 0.5) * 0.6, seed * 13 + i); }
  for (const tw of twigs) { fan(g, tw[2][0], tw[2][1], 50 + r() * 30, -PI / 2 + (r() - 0.5) * 0.5, seed * 29 + tw[2][0]); dryStroke(g, spline(tw, 4), { width: (s) => lerp(7, 2, s), color: INK[0], alpha: 0.9, dry: 0.3, seed: seed + tw[0][0], tin: 0.01, tout: 0.2 }); }
  dryStroke(g, pts, { width: (s) => lerp(20, 4, s), color: INK[0], alpha: 0.95, dry: 0.35, seed: seed * 3, tin: 0.01, tout: 0.15, density: 1 });
  dryStroke(g, pts, { width: (s) => lerp(12, 2, s), color: INK[0], alpha: 0.9, dry: 0.1, seed: seed * 5, tin: 0.01, tout: 0.2, density: 1 });
  return b;
}
export function bough(g, i, x, y, sc, rot, flip, t, ph) {
  g.save(); g.translate(x, y); g.rotate(rot + 0.022 * Math.sin(t * 0.95 + ph) + 0.009 * Math.sin(t * 2.4 + ph * 2.1)); g.scale(sc * flip, sc);
  g.drawImage(K.BOUGH[i % K.BOUGH.length].c, -30, -250); g.restore();
}
/** A pine trunk: mid wash, dark dry strokes on the side away from the sun, bark scales. `lit` is +1 if the sun is to the right. */
export function trunk(g, ctrl, w0, w1, seed, lit = 1) {
  const pts = spline(ctrl, 4), r = seeded(seed * 71), wf = (s) => lerp(w0, w1, s) * (1 + 0.07 * Math.sin(s * 31 + seed));
  g.save();
  g.fillStyle = INK[3]; g.globalAlpha = 0.82; g.filter = "blur(1.2px)"; ribbon(g, pts, (s) => wf(s) * 0.5); g.fill(); g.filter = "none";
  const n = pts.length, sh = pts.map((p, i) => { const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)], d = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, s = i / (n - 1); let nx = -(b[1] - a[1]) / d, ny = (b[0] - a[0]) / d; if (nx * lit > 0) { nx = -nx; ny = -ny; } return [p[0] + nx * wf(s) * 0.2, p[1] + ny * wf(s) * 0.2]; });
  dryStroke(g, sh, { width: (s) => wf(s) * 0.62, color: INK[0], alpha: 0.9, dry: 0.4, seed: seed + 1, tin: 0.005, tout: 0.02, density: 0.9 });
  dryStroke(g, pts, { width: (s) => wf(s) * 0.98, color: INK[0], alpha: 0.6, dry: 0.85, seed: seed + 2, tin: 0.005, tout: 0.02, density: 0.7 });
  g.strokeStyle = INK[0]; g.lineCap = "round";
  for (let i = 0; i < n * 0.9; i++) {       // bark scales
    const k = Math.floor(r() * (n - 2)) + 1, s = k / (n - 1), w = wf(s), off = (r() - 0.5) * w * 0.8, a = pts[k - 1], b = pts[k + 1], d = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, tx = (b[0] - a[0]) / d, ty = (b[1] - a[1]) / d;
    const x = pts[k][0] - ty * off, y = pts[k][1] + tx * off, L = 6 + r() * w * 0.16;
    g.globalAlpha = 0.35 + 0.5 * r(); g.lineWidth = 1 + r() * 2.2;
    g.beginPath(); g.moveTo(x - tx * L - ty * 3, y - ty * L + tx * 3); g.quadraticCurveTo(x + ty * 5, y - tx * 5, x + tx * L - ty * 3, y + ty * L + tx * 3); g.stroke();
  }
  g.restore();
}
export function tuft(g, x, y, n, h, seed, color = INK[0], alpha = 0.85) {
  const r = seeded(seed * 97 + 1);
  g.save(); g.fillStyle = color;
  for (let i = 0; i < n; i++) {
    const bx = x + (r() - 0.5) * n * 2.4, lean = (r() - 0.65) * h * 0.9, hh = h * (0.45 + 0.6 * r());
    g.globalAlpha = alpha * (0.5 + 0.5 * r());
    ribbon(g, spline([[bx, y + 2], [bx + lean * 0.3, y - hh * 0.55], [bx + lean, y - hh]], 5), (s) => (1.6 + h * 0.012) * (1 - s)); g.fill();
  }
  g.restore();
}
/** Ground the way a brush states it: a pale wash that dies away below the edge, and a few long dry strokes. Never a slab. */
export function ground(g, top, o = {}) {
  const seed = o.seed ?? 9, pts = craggy(spline(top, 26), o.jag ?? 6, seed, 11), minY = Math.min(...pts.map((p) => p[1])), depth = o.depth ?? 400, r = seeded(seed * 7 + 2);
  wash(g, (s) => { s.moveTo(pts[0][0], H + 60); for (const p of pts) s.lineTo(p[0], p[1]); s.lineTo(pts[pts.length - 1][0], H + 60); s.closePath(); }, {
    color: INK[o.tone ?? 4], alpha: o.alpha ?? 0.62, soft: 2.5, rim: 0.34, rimW: 12, grain: 0.3, pool: 0.34, pools: 26, seed, box: [0, minY, W, depth], fade: o.fade ?? [0, minY + 10, 0, minY + depth, 1, 0],
    inner: (s) => { for (let i = 0; i < 14; i++) { const x = r() * W - 80, y = polyY(pts, x + 80) + 30 + r() * depth * 0.6, Ls = 120 + r() * 320; dryStroke(s, [[x, y], [x + Ls * 0.5, y + 4], [x + Ls, y + 1]], { width: 8 + r() * 26, color: INK[1], alpha: 0.4, dry: 0.75, seed: seed * 13 + i, tin: 0.05, tout: 0.4 }); } },
  });
  for (let i = 0; i < (o.strokes ?? 16); i++) {      // long dry strokes, densest just under the edge
    const x = r() * (W + 200) - 200, k = Math.pow(r(), 1.7), Ls = 150 + r() * 420, y = polyY(pts, x + Ls / 2) + 5 + k * depth * 0.55, st = [];
    for (let j = 0; j <= 10; j++) { const u = j / 10; st.push([x + Ls * u, y + Math.sin(u * 3 + i) * 4 + (polyY(pts, x + Ls * u) - polyY(pts, x + Ls / 2)) * (1 - k)]); }
    dryStroke(g, st, { width: 5 + r() * 20 * (1 - k * 0.5), color: INK[r() < 0.5 ? 0 : 1], alpha: 0.6 * (1 - k * 0.75), dry: 0.8, seed: seed * 17 + i, tin: 0.05, tout: 0.45 });
  }
  dryStroke(g, pts, { width: o.edge ?? 10, color: INK[0], alpha: 0.8, dry: 0.72, seed: seed + 3, tin: 0.004, tout: 0.004 });
  const r2 = seeded(seed * 3 + 9);
  for (let i = 0; i < (o.stones ?? 5); i++) { const x = 40 + r2() * (W - 80), wd = 40 + r2() * 80; rock(g, x, polyY(pts, x) + 4 + r2() * 10, wd, wd * (0.4 + 0.25 * r2()), seed * 11 + i, o.tone ?? 3); }
  for (let i = 0; i < (o.tufts ?? 16); i++) { const x = r2() * W; tuft(g, x, polyY(pts, x) + 3, 7 + Math.floor(r2() * 8), (o.grassH ?? 34) * (0.6 + 0.8 * r2()), seed * 5 + i); }
  return pts;
}
export function rock(g, cx, cy, w, h, seed, tone = 3) {
  const r = seeded(seed * 41 + 3), P = [];
  for (let i = 0; i < 9; i++) { const a = (i / 9) * TAU, rr = 0.8 + 0.4 * r(); P.push([cx + Math.cos(a) * w * 0.5 * rr, cy + Math.sin(a) * h * 0.5 * rr * (Math.sin(a) > 0 ? 0.5 : 1)]); }
  const pts = craggy([...P, P[0]], Math.min(6, w * 0.03), seed, 9);
  wash(g, (s) => trace(s, pts, true), { color: INK[tone], alpha: 0.8, rim: 0.55, rimW: Math.min(10, w * 0.08), grain: 0.3, pool: 0.3, seed, box: [cx - w / 2, cy - h / 2, w, h],
    inner: (s) => { for (let i = 0; i < 9; i++) { const x = cx + (r() - 0.5) * w * 0.8, y = cy - h * 0.4 + r() * h * 0.5, L = h * (0.3 + 0.4 * r()); dryStroke(s, [[x, y], [x - L * 0.25, y + L * 0.5], [x - L * 0.4, y + L]], { width: 4 + r() * w * 0.07, color: INK[0], alpha: 0.5, dry: 0.7, seed: seed * 3 + i }); } } });
  dryStroke(g, pts.slice(Math.floor(pts.length * 0.5), Math.floor(pts.length * 0.98)), { width: Math.min(7, 2 + w * 0.03), color: INK[0], alpha: 0.9, dry: 0.4, seed: seed + 5, tin: 0.05, tout: 0.1 });
}

function petalSprite(blur) {
  const p = cv(64, 64), g = p.g;
  g.translate(32, 32); g.filter = blur ? `blur(${blur}px)` : "none";
  g.fillStyle = VERM; g.beginPath(); g.moveTo(0, 18); g.bezierCurveTo(-17, 8, -15, -12, -5, -17); g.lineTo(0, -11); g.lineTo(5, -17); g.bezierCurveTo(15, -12, 17, 8, 0, 18); g.fill();
  g.globalAlpha = 0.45; g.fillStyle = VERM_D; g.beginPath(); g.ellipse(0, 10, 4, 7, 0, 0, TAU); g.fill();
  g.globalAlpha = 0.3; g.fillStyle = "#f2c9b6"; g.beginPath(); g.ellipse(-5, -5, 4, 7, 0.3, 0, TAU); g.fill();
  return p;
}
/** The seal: a square stamp carved with a picture (a disc over three lines of mist). No character, no letter. */
function sealSprite() {
  const s = cv(140, 140), g = s.g, r = seeded(88);
  rpoly(g, [[12 + r() * 3, 12 + r() * 3], [128 - r() * 3, 11 + r() * 3], [129 - r() * 3, 128 - r() * 3], [11 + r() * 3, 129 - r() * 3]], 9);
  g.fillStyle = VERM; g.fill();
  g.globalCompositeOperation = "destination-out"; g.lineCap = "round"; g.strokeStyle = "#000"; g.fillStyle = "#000";
  g.beginPath(); g.arc(84, 50, 17, 0, TAU); g.fill();
  g.lineWidth = 8;
  for (let i = 0; i < 3; i++) { const y = 80 + i * 16; g.beginPath(); g.moveTo(28 + i * 5, y); g.bezierCurveTo(50, y - 9, 72, y + 9, 112 - i * 7, y - 2); g.stroke(); }
  g.globalAlpha = 0.5; g.fillStyle = K.PAT.grain; g.fillRect(0, 0, 140, 140);
  for (let i = 0; i < 26; i++) { g.globalAlpha = 0.6; g.fillStyle = "#000"; g.beginPath(); g.arc(r() * 140, r() * 140, 0.8 + r() * 2.4, 0, TAU); g.fill(); }
  return s;
}
function splashSprite() {       // origin at (60, 440); thrown up and to the right
  const s = cv(760, 520), g = s.g, r = seeded(77);
  g.fillStyle = INK[0];
  for (let i = 0; i < 90; i++) {
    const d = Math.pow(r(), 0.7) * 620, a = (-38 + (r() - 0.5) * 50) * PI / 180, size = (2 + r() * 13) * (1 - d / 760), x = 60 + Math.cos(a) * d, y = 440 + Math.sin(a) * d;
    g.globalAlpha = 0.55 + 0.4 * r(); g.beginPath(); g.ellipse(x, y, size * (1.4 + r() * 1.6), size * 0.6, a, 0, TAU); g.fill();
    if (r() < 0.4) { g.beginPath(); g.arc(x + Math.cos(a) * size * 4, y + Math.sin(a) * size * 4, size * 0.3, 0, TAU); g.fill(); }
  }
  return s;
}
function slashSprite() {        // a single dry crescent, from (40, 470) up to (700, 60)
  const s = cv(760, 520), pts = spline([[40, 470], [200, 420], [400, 300], [570, 170], [700, 60]], 4);
  dryStroke(s.g, pts, { width: (u) => 90 * Math.sin(PI * clamp(u, 0.02, 1)) + 6, color: INK[0], alpha: 0.75, dry: 0.95, seed: 61, tin: 0.02, tout: 0.5, density: 0.55 });
  return s;
}
export function makeField(kind, seed) {
  const w = 270, h = 480, f = new Float32Array(w * h), r = seeded(seed * 19 + 1);
  const org = [[0.2 + r() * 0.6, 0.2 + r() * 0.2], [0.15 + r() * 0.7, 0.45 + r() * 0.2], [0.2 + r() * 0.6, 0.75 + r() * 0.15]];
  let lo = 1e9, hi = -1e9;
  for (let y = 0, i = 0; y < h; y++) for (let x = 0; x < w; x++, i++) {
    let v;
    if (kind === "bleed") { let d = 9; for (const o of org) d = Math.min(d, Math.hypot((x / w - o[0]) * 0.5625, y / h - o[1])); v = d * 1.5 + (NZ.fbm(x * 0.022 + seed * 3, y * 0.022, 4) - 0.5) * 0.5 + (NZ(x * 0.2, y * 0.2 + seed) - 0.5) * 0.05; }
    else v = (x / w) * 0.9 + (NZ(x * 0.012 + seed, y * 0.21) - 0.5) * 0.5 + (NZ(x * 0.05, y * 1.1 + seed) - 0.5) * 0.12;
    f[i] = v; lo = Math.min(lo, v); hi = Math.max(hi, v);
  }
  for (let i = 0; i < f.length; i++) f[i] = (f[i] - lo) / (hi - lo);
  return f;
}

// ── Petals and grass ────────────────────────────────────────────────────────
function makePetals() {
  const r = seeded(314), out = [];
  for (let i = 0; i < 170; i++) {
    const d = r() < 0.5 ? 0 : r() < 0.72 ? 1 : 2;
    out.push({ d, x0: r() * (W + 160), y0: r() * (H + 160), vy: [70, 130, 250][d] * (0.7 + 0.6 * r()), vx: [26, 50, 110][d] * (0.6 + 0.8 * r()), sa: [16, 30, 60][d] * (0.5 + r()), sf: 0.8 + r() * 1.6, ph: r() * TAU, r0: r() * TAU, rs: (r() - 0.5) * 3.4, fs: 1.2 + r() * 2.6, size: [0.34, 0.66, 1.45][d] * (0.7 + 0.6 * r()), delay: r() * 2.4 });
  }
  return out;
}
/** Petals at one depth. `count` thins them; `cascade` is the second a fall begins from the top of the frame. */
export function petals(g, t, depth, count, cascade = null, seedShift = 0) {
  g.save();
  for (let i = 0; i < K.PETS.length; i++) {
    const p = K.PETS[i]; if (p.d !== depth) continue;
    if ((i * 37 + seedShift * 11) % 100 >= count * 100) continue;
    let x, y;
    if (cascade !== null) { const tt = t - cascade - p.delay; if (tt < 0) continue; y = -70 + tt * p.vy * 1.25; if (y > H + 70) continue; x = mod(p.x0 + seedShift * 211 - tt * p.vx + Math.sin(tt * p.sf + p.ph) * p.sa, W + 160) - 80; }
    else { y = mod(p.y0 + seedShift * 173 + t * p.vy, H + 160) - 80; x = mod(p.x0 + seedShift * 211 - t * p.vx + Math.sin(t * p.sf + p.ph) * p.sa, W + 160) - 80; }
    const flip = Math.cos(t * p.fs + p.ph);
    g.setTransform(1, 0, 0, 1, 0, 0); g.translate(x, y); g.rotate(p.r0 + t * p.rs); g.scale(p.size, p.size * (Math.abs(flip) < 0.18 ? 0.18 * (flip < 0 ? -1 : 1) : flip));
    g.globalAlpha = [0.6, 0.82, 0.78][depth]; g.drawImage(K.PETSPR[depth].c, -32, -32);
  }
  g.restore();
}
export function grassBlades(g, t, list, color = INK[0]) {
  g.save(); g.fillStyle = color;
  for (const b of list) {
    const sway = Math.sin(t * 1.6 + b.p) * b.h * 0.07 + Math.sin(t * 3.1 + b.p * 2) * b.h * 0.025;
    g.globalAlpha = b.a;
    ribbon(g, spline([[b.x, b.y], [b.x + b.lean * 0.3 + sway * 0.3, b.y - b.h * 0.55], [b.x + b.lean + sway, b.y - b.h]], 12), (s) => b.w * (1 - s)); g.fill();
  }
  g.restore();
}
export function makeBlades(seed, n, x0, x1, y, hMin, hMax) {
  const r = seeded(seed);
  return Array.from({ length: n }, () => ({ x: lerp(x0, x1, r()), y: y + r() * 30, h: lerp(hMin, hMax, r()), lean: (r() - 0.65) * 110, p: r() * TAU, w: 3 + r() * 5, a: 0.75 + r() * 0.22 }));
}

/** Everything that is baked once and shared by every shot. */
export function initInk() {
  K.S1 = cv(); K.FIG = cv();
  const fine = seeded(99);
  K.GRAINT = tile(() => { const v = 112 + fine() * 32; return [v, v, v, 255]; });
  const gf = wrap((x, y) => NZ.fbm(x * 0.12, y * 0.12, 3), 512), sf = wrap((x, y) => NZ(x * 0.006 + 3, y * 0.11), 512);
  K.PAT.grain = K.S1.g.createPattern(tile((x, y) => [0, 0, 0, clamp((gf(x, y) - 0.42) * 2.8) * (0.5 + 0.5 * fine()) * 255]).c, "repeat");
  K.PAT.streak = K.S1.g.createPattern(tile((x, y) => [0, 0, 0, clamp((sf(x, y) - 0.6) * 4) * 255]).c, "repeat");
  K.PAPER = bakePaper();
  K.MIST = [mistTex(1), mistTex(2), mistTex(3)];
  K.BOUGH = [makeBough(11), makeBough(12), makeBough(13)];
  K.PETSPR = [petalSprite(0.6), petalSprite(1.4), petalSprite(3)];
  K.PETS = makePetals();
  K.SEAL = sealSprite(); K.SPLASH = splashSprite(); K.SLASH = slashSprite();
}
