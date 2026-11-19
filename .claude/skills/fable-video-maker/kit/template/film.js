/**
 * THE SAMPLE FILM, and the shape every film takes.
 *
 * Six seconds, three shots: dusk, night, dawn over the same hills. It is here to prove the kit
 * works on this machine and to show the contract. Replace everything below `THE FILM` with your
 * own, and keep the contract:
 *
 *   window.film = { duration, fps, width, height, shots, ready, seek(t) }
 *
 *   seek(t) draws the exact frame for second t and nothing else decides the picture: no clock,
 *   no Math.random without a seed, no state carried from the frame before. Seeking 4.0 after
 *   1.0 must give the same pixels as seeking 4.0 first. The capture runs several pages at once
 *   and each takes its own slice of frames, so a film that breaks this comes out torn.
 *
 *   shots lists every shot. A shot may name seconds worth a still of their own (a hit, a turn, a
 *   join): { id: "s03", start: 6.4, end: 9.2, also: [7.1] }. The stills pass shows those too.
 *
 *   ready resolves when fonts are loaded and the still parts are baked. Bake once (paper, skies,
 *   grain, washes) into offscreen canvases; draw only what moves in seek().
 */
const W = 1080, H = 1920, FPS = 30, DURATION = 6;

// ── Tools every film needs ──────────────────────────────────────────────────
/** A random source with a seed: the same numbers every run. */
function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const smooth = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };
const lerp = (a, b, k) => a + (b - a) * k;
function plate(draw, w = W, h = H) {
  const c = new OffscreenCanvas(w, h);
  draw(c.getContext("2d"), w, h);
  return c;
}

// ── THE FILM ────────────────────────────────────────────────────────────────
// The shot list, on the film's own timeline. The kit takes a still from the middle of each.
const SHOTS = [
  { id: "s01-dusk", start: 0, end: 2, sky: ["#241d52", "#c45c7c", "#ff9659", "#ffe6b4"], sun: "#fff8de", sunY: 0.5, hills: ["#a06b9c", "#5e3f7a", "#21153a"], stars: 0.15 },
  { id: "s02-night", start: 2, end: 4, sky: ["#060920", "#141a4a", "#2a2460", "#4b3a7c"], sun: "#e8e4ff", sunY: 0.24, hills: ["#2a2a66", "#191541", "#07060c"], stars: 1 },
  { id: "s03-dawn", start: 4, end: 6, sky: ["#6a78c0", "#e8b0b8", "#ffd9a8", "#fff4d6"], sun: "#ffffff", sunY: 0.44, hills: ["#b98fb0", "#7a5a96", "#33224f"], stars: 0 },
];
// Captions: short lines, each with its words and their seconds (kit/captions.mjs writes these from words.json).
const CAPTIONS = [
  { s: 0.2, e: 1.85, words: [{ w: "This", s: 0.2, e: 0.5 }, { w: "film", s: 0.5, e: 0.9 }, { w: "is", s: 0.9, e: 1.1 }, { w: "code.", s: 1.1, e: 1.7 }] },
  { s: 2.2, e: 3.75, words: [{ w: "Every", s: 2.2, e: 2.7 }, { w: "frame.", s: 2.7, e: 3.6 }] },
  { s: 4.2, e: 5.4, words: [{ w: "Every", s: 4.2, e: 4.7 }, { w: "time.", s: 4.7, e: 5.25 }] },
];

const canvas = document.getElementById("c");
const ctx = canvas.getContext("2d");
let PLATES = [], GRAIN, STARS = [], BLADES = [];

async function bake() {
  // The caption font ships with the kit, so the capture needs no network.
  const font = new FontFace("Lora", "url(./fonts/Lora.ttf)", { weight: "400 700" });
  document.fonts.add(await font.load());

  const rnd = seeded(7);
  STARS = Array.from({ length: 120 }, () => ({ x: rnd() * W, y: rnd() * H * 0.6, r: 1 + rnd() * 2.2, p: rnd() * 6.28, sp: 0.8 + rnd() * 2 }));
  BLADES = Array.from({ length: 70 }, (_, i) => ({ x: (i / 70) * (W + 60) - 30 + rnd() * 20, h: 90 + rnd() * 190, lean: (rnd() - 0.5) * 50, p: rnd() * 6.28 }));
  // One plate a shot: the sky and its glow never change inside a shot, so they are drawn once.
  PLATES = SHOTS.map((s) => plate((c) => {
    const g = c.createLinearGradient(0, 0, 0, H * 0.72);
    s.sky.forEach((col, i) => g.addColorStop(i / (s.sky.length - 1), col));
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    const sx = W * 0.64, sy = H * s.sunY;
    const glow = c.createRadialGradient(sx, sy, 0, sx, sy, 640);
    glow.addColorStop(0, s.sun + "ee"); glow.addColorStop(0.12, s.sun + "88"); glow.addColorStop(1, s.sun + "00");
    c.fillStyle = glow; c.fillRect(0, 0, W, H);
  }));
  // Grain is one tile, laid over every frame: paper tooth, not salt and pepper.
  GRAIN = plate((c, w, h) => {
    const img = c.createImageData(w, h), r = seeded(99);
    for (let i = 0; i < img.data.length; i += 4) { const v = 118 + r() * 20; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255; }
    c.putImageData(img, 0, 0);
  }, 512, 512);
}

/** A ridge of hills: `k` moves it sideways and scales it, so the push-in has depth. */
function hills(shot, layer, k) {
  const y0 = H * [0.56, 0.64, 0.74][layer];
  const amp = [70, 60, 46][layer], drift = [8, 18, 40][layer] * k, grow = 1 + [0.01, 0.025, 0.06][layer] * k;
  ctx.save();
  ctx.translate(W / 2 - drift, H); ctx.scale(grow, grow); ctx.translate(-W / 2, -H);
  ctx.beginPath(); ctx.moveTo(-80, H + 20);
  for (let x = -80; x <= W + 80; x += 20) ctx.lineTo(x, y0 + Math.sin(x * 0.006 + layer * 2.1) * amp + Math.sin(x * 0.017 + layer) * amp * 0.35);
  ctx.lineTo(W + 80, H + 20); ctx.closePath();
  ctx.fillStyle = shot.hills[layer]; ctx.fill();
  ctx.restore();
}

function scene(shot, t) {
  const k = smooth((t - shot.start) / (shot.end - shot.start)); // 0 → 1 across the shot: the slow push-in
  const i = SHOTS.indexOf(shot);
  ctx.save();
  ctx.translate(W / 2, H * 0.62); ctx.scale(1 + 0.05 * k, 1 + 0.05 * k); ctx.translate(-W / 2, -H * 0.62);
  ctx.drawImage(PLATES[i], 0, 0);
  if (shot.stars) for (const s of STARS) {
    ctx.globalAlpha = shot.stars * (0.35 + 0.65 * (0.5 + 0.5 * Math.sin(s.p + t * s.sp)));
    ctx.fillStyle = "#fff8e6"; ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 6.3); ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.fillStyle = shot.sun; ctx.beginPath(); ctx.arc(W * 0.64, H * shot.sunY - 14 * k, 58, 0, 6.3); ctx.fill();
  ctx.restore();
  hills(shot, 0, k); hills(shot, 1, k);
  // One small figure on the middle ridge, so the frame has a subject.
  ctx.fillStyle = shot.hills[2];
  const fx = W * 0.2 - 18 * k, fy = H * 0.628;
  ctx.beginPath(); ctx.moveTo(fx - 16, fy); ctx.lineTo(fx - 7, fy - 78); ctx.lineTo(fx + 7, fy - 78); ctx.lineTo(fx + 16, fy); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.arc(fx, fy - 92, 12, 0, 6.3); ctx.fill();
  hills(shot, 2, k);
  // Grass in front, moving in the wind: closed-form, so any second can be drawn on its own.
  ctx.fillStyle = "#0c0619";
  for (const b of BLADES) {
    const sway = Math.sin(t * 1.7 + b.p) * 16;
    ctx.beginPath(); ctx.moveTo(b.x, H + 4);
    ctx.quadraticCurveTo(b.x + b.lean * 0.3, H - b.h * 0.55, b.x + b.lean + sway, H - b.h);
    ctx.quadraticCurveTo(b.x + b.lean * 0.4 + 8, H - b.h * 0.5, b.x + 12, H + 4); ctx.fill();
  }
}

function caption(t) {
  const line = CAPTIONS.find((c) => t >= c.s && t < c.e);
  if (!line) return; // past its end a line is gone: nothing left behind
  const rise = smooth((t - line.s) / 0.1);
  ctx.save();
  ctx.font = "600 48px Lora, Georgia, serif";
  ctx.textBaseline = "alphabetic";
  const space = ctx.measureText(" ").width;
  const widths = line.words.map((w) => ctx.measureText(w.w).width);
  let x = (W - (widths.reduce((s, w) => s + w, 0) + space * (line.words.length - 1))) / 2;
  const y = 1240 + (1 - rise) * 10; // the baseline: 65% of the height, clear of the apps' buttons
  ctx.globalAlpha = rise;
  ctx.lineJoin = "round";
  line.words.forEach((w, i) => {
    ctx.shadowColor = "rgba(0,0,0,0.45)"; ctx.shadowBlur = 11; ctx.shadowOffsetY = 2;
    ctx.strokeStyle = "rgba(20,12,4,0.85)"; ctx.lineWidth = 5; ctx.strokeText(w.w, x, y);
    ctx.shadowColor = "transparent";
    ctx.fillStyle = t >= w.s && t < w.e ? "#ffc94d" : "#fff1d6"; // the spoken word in gold
    ctx.fillText(w.w, x, y);
    x += widths[i] + space;
  });
  ctx.restore();
}

function seek(t) {
  t = clamp(t, 0, DURATION - 1e-6);
  const i = SHOTS.findIndex((s) => t >= s.start && t < s.end);
  const shot = SHOTS[i];
  ctx.clearRect(0, 0, W, H);
  scene(shot, t);
  // An eight-frame crossfade into the next shot, drawn from both shots' own times.
  const fade = 8 / FPS, next = SHOTS[i + 1];
  if (next && t > shot.end - fade) {
    ctx.globalAlpha = smooth((t - (shot.end - fade)) / fade);
    scene(next, next.start);
    ctx.globalAlpha = 1;
  }
  // Finish: grain and a soft vignette over everything but the words.
  ctx.save();
  ctx.globalCompositeOperation = "soft-light"; ctx.globalAlpha = 0.5;
  ctx.fillStyle = ctx.createPattern(GRAIN, "repeat"); ctx.fillRect(0, 0, W, H);
  ctx.restore();
  const v = ctx.createRadialGradient(W / 2, H * 0.46, H * 0.3, W / 2, H * 0.46, H * 0.72);
  v.addColorStop(0, "rgba(10,5,30,0)"); v.addColorStop(1, "rgba(10,5,30,0.5)");
  ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
  caption(t);
}

window.film = { duration: DURATION, fps: FPS, width: W, height: H, shots: SHOTS.map(({ id, start, end }) => ({ id, start, end })), ready: bake().then(() => seek(0)), seek };
