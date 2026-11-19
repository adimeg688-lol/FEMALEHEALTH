/**
 * THE QUIET BLADE: an ink-wash film, 16 s, 1080 x 1920, 30 fps.
 *
 * The contract: window.film = { duration, fps, width, height, shots, ready, seek(t) }.
 * seek(t) is a pure function of t: every motion is closed-form (sines, eased ramps, seeded noise
 * sampled at t). Nothing is carried from one frame to the next. All that does not move (paper,
 * mountains, trunks, ground, sprites) is baked once before `ready`.
 *
 *   ink.js      the brush: strokes, washes, mountains, pines, paper, mist, petals
 *   figures.js  the swordsman and the master
 *   film.js     the five shots, the ink-bleed joins, the finish
 */
import { W, H, PI, TAU, seeded, clamp, smooth, lerp, mod, ramp, cv, PAPER, INK, NZ, K, spline, craggy, trace, ribbon, dryStroke, wash, mist, haze, glow, sun, mountain, bough, trunk, tuft, ground, rock, petals, grassBlades, makeBlades, makeField, initInk } from "./ink.js";
import { inkFigure, swordsmanSide, masterSide, seatedBack, swordsmanBack } from "./figures.js";

const FPS = 30, DURATION = 16;
const SHOTS = [
  { id: "s01-climb", start: 0, end: 3.4 },
  { id: "s02-master", start: 3.4, end: 6.4 },
  { id: "s03-draw", start: 6.4, end: 9.2 },
  { id: "s04-still", start: 9.2, end: 12.4 },
  { id: "s05-sit", start: 12.4, end: 16 },
];
const CUTS = [{ at: 3.4, kind: "bleed", f: 1 }, { at: 6.4, kind: "brush", f: 2 }, { at: 9.2, kind: "bleed", f: 3 }, { at: 12.4, kind: "bleed", f: 4 }];
const DRUM = 7.0, TURN = 10.6, SEAL_AT = 13.9;       // from the score: the draw, the bell, the seal
const PL = {}, FIELD = {};
let TB, MB, MI;

/** A push-in with parallax: near planes grow faster than far ones, and a crane-up drops them faster too. */
function cam(g, c, depth) { const s = 1 + c.z * (0.3 + 0.7 * depth); g.translate(c.fx, c.fy); g.scale(s, s); g.translate(-c.fx, -c.fy + (c.ty ?? 0) * depth); }
function layer(g, plate, c, depth) { g.save(); cam(g, c, depth); g.drawImage(plate.c, 0, 0); g.restore(); }
function boughs(g, t, list) { for (const [i, x, y, s, r, ph] of list) bough(g, i, x, y, s, r, 1, t, ph); }

// ── s01: the climb ──────────────────────────────────────────────────────────
const STAIR = { x0: 150, y0: 1575, w: 46, h: 27 };
const stairY = (x) => STAIR.y0 - clamp((x - STAIR.x0) / STAIR.w, 0, 13) * STAIR.h;
function bakeS01() {
  const far = cv(), mid = cv(), near = cv(), fg = cv();
  glow(far.g, 730, 548, 108, 0.5);
  sun(far.g, 730, 548, 108, 0.74, 101);
  mountain(far.g, { seed: 11, base: 900, height: 230, peaks: 5, pw: 190, tone: 6, alpha: 0.55, band: 190, strokes: 10 });
  haze(far.g, 760, 1010, 0.6);
  mountain(far.g, { seed: 12, base: 1090, height: 280, peaks: 4, pw: 220, tone: 5, alpha: 0.62, band: 230, strokes: 16, dots: 70 });
  haze(far.g, 960, 1200, 0.55);
  mountain(mid.g, { seed: 13, base: 1330, height: 300, peaks: 3, pw: 240, tone: 4, alpha: 0.7, band: 280, strokes: 26, dots: 120, hero: [{ c: 130, h: 560, w: 230, sk: -0.2, e: 1.2 }, { c: 250, h: 330, w: 150, sk: 0.3, e: 1.1 }] });
  haze(mid.g, 1150, 1450, 0.5);
  // the crag with the pine on it: a tower of rock, its foot lost in mist
  const Lf = [[612, 652], [590, 702], [560, 722], [566, 802], [530, 832], [540, 932], [500, 962], [512, 1082], [470, 1112], [480, 1242], [440, 1282], [452, 1422], [410, 1462], [420, 1622], [380, 1702], [372, 1980]];
  const Rt = [[902, 652], [922, 692], [952, 722], [942, 822], [982, 862], [972, 992], [1012, 1032], [1002, 1182], [1052, 1232], [1042, 1382], [1092, 1442], [1160, 1502], [1160, 1980]];
  const topE = [[612, 652], [660, 641], [720, 645], [790, 637], [850, 643], [902, 652]];
  const outline = craggy([...Lf.slice().reverse(), ...topE.slice(1), ...Rt.slice(1)], 9, 31), leftEdge = craggy(Lf, 9, 33), rightEdge = craggy(Rt, 7, 34);
  const path = spline([[560, 1640], [520, 1500], [585, 1390], [535, 1260], [600, 1140], [556, 1020], [622, 910], [590, 800], [640, 726], [662, 660]], 6);
  wash(mid.g, (s) => trace(s, outline, true), { color: PAPER, alpha: 1, soft: 1.6, rim: 0, grain: 0, pool: 0, fade: [0, 900, 0, 1560, 1, 0] });     // so the far ridges do not show through the rock
  wash(mid.g, (s) => trace(s, outline, true), { color: INK[3], alpha: 0.84, soft: 1.6, rim: 0.5, rimW: 14, grain: 0.3, pool: 0.34, pools: 30, seed: 31, box: [360, 640, 800, 1000], fade: [0, 760, 0, 1620, 1, 0],
    inner: (s) => {
      const r = seeded(310), lg = s.createLinearGradient(380, 0, 900, 0);
      lg.addColorStop(0, "rgba(15,13,11,0.6)"); lg.addColorStop(0.6, "rgba(15,13,11,0.12)"); lg.addColorStop(1, "rgba(239,230,210,0.16)"); s.fillStyle = lg; s.fillRect(300, 600, 900, 1400);
      for (let i = 0; i < 110; i++) { const x = 420 + r() * 660, y = 650 + r() * 860, Ls = 70 + r() * 250, st = []; for (let k = 0; k <= 8; k++) { const u = k / 8; st.push([x - Ls * 0.16 * u + Math.sin(u * 4 + i) * 5, y + Ls * u]); } dryStroke(s, st, { width: 5 + r() * 26, color: INK[r() < 0.6 ? 0 : 1], alpha: 0.55, dry: 0.7, seed: 500 + i, tin: 0.04, tout: 0.45 }); }
      for (const [x, y, wd] of [[566, 800, 150], [540, 930, 170], [512, 1080, 190], [942, 822, -120], [972, 992, -150]]) dryStroke(s, [[x, y], [x + wd * 0.5, y + 8], [x + wd, y + 3]], { width: 9, color: INK[0], alpha: 0.7, dry: 0.6, seed: x, tin: 0.02, tout: 0.6 });   // ledges
      s.save(); s.globalCompositeOperation = "destination-out"; s.strokeStyle = "#000"; s.lineCap = "round"; s.lineJoin = "round"; s.globalAlpha = 0.5; s.filter = "blur(1.2px)"; s.lineWidth = 9; s.beginPath(); trace(s, path); s.stroke(); s.restore();   // the path: bare paper
      s.strokeStyle = INK[0]; s.lineWidth = 2; s.globalAlpha = 0.55; for (let i = 3; i < path.length - 2; i += 3) { const a = path[i - 1], b = path[i + 1], d = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, nx = -(b[1] - a[1]) / d, ny = (b[0] - a[0]) / d; s.beginPath(); s.moveTo(path[i][0] - nx * 7, path[i][1] - ny * 7); s.lineTo(path[i][0] + nx * 7, path[i][1] + ny * 7); s.stroke(); }
    } });
  dryStroke(mid.g, leftEdge.slice(0, Math.floor(leftEdge.length * 0.8)), { width: 17, color: INK[0], alpha: 0.9, dry: 0.45, seed: 33, tin: 0.01, tout: 0.3 });
  dryStroke(mid.g, craggy(topE, 3, 36, 8), { width: 9, color: INK[0], alpha: 0.9, dry: 0.3, seed: 34, tin: 0.02, tout: 0.02 });
  dryStroke(mid.g, rightEdge.slice(0, Math.floor(rightEdge.length * 0.7)), { width: 9, color: INK[0], alpha: 0.7, dry: 0.7, seed: 35, tin: 0.01, tout: 0.4 });
  for (let i = 0; i < 9; i++) tuft(mid.g, 620 + i * 32, 646 + (i % 3) * 3, 6, 15, 60 + i);
  trunk(mid.g, [[846, 650], [856, 568], [806, 480], [730, 418], [640, 384]], 26, 8, 41, -1);
  trunk(mid.g, [[846, 560], [890, 520], [960, 500]], 10, 4, 42, -1);
  trunk(mid.g, [[790, 462], [820, 400], [880, 350]], 10, 4, 43, -1);
  // the near slope, its crest cut into steps
  const top = [[-60, 1640], [60, 1608], [STAIR.x0, STAIR.y0]];
  for (let i = 1; i <= 13; i++) { top.push([STAIR.x0 + (i - 1) * STAIR.w + 4, STAIR.y0 - i * STAIR.h + 1]); top.push([STAIR.x0 + i * STAIR.w, STAIR.y0 - i * STAIR.h]); }
  const tail = craggy([[STAIR.x0 + 13 * STAIR.w, STAIR.y0 - 13 * STAIR.h], [840, 1200], [960, 1150], [1150, 1126]], 6, 37, 10); top.push(...tail.slice(1));
  wash(near.g, (s) => { s.moveTo(-60, H + 60); for (const p of top) s.lineTo(p[0], p[1]); s.lineTo(1150, H + 60); s.closePath(); }, { color: INK[2], alpha: 0.88, soft: 1.4, rim: 0.6, rimW: 14, grain: 0.28, pool: 0.36, pools: 30, seed: 51, box: [0, 1150, W, 770], fade: [0, 1400, 0, 1960, 1, 0.62],
    inner: (s) => { const r = seeded(77); for (let i = 0; i < 80; i++) { const x = r() * W, y = Math.max(stairY(x), 1200) + 24 + r() * 600, Ls = 80 + r() * 280, st = []; for (let k = 0; k <= 8; k++) { const u = k / 8; st.push([x - Ls * 0.5 * u, y + Ls * 0.6 * u]); } dryStroke(s, st, { width: 8 + r() * 32, color: INK[0], alpha: 0.55, dry: 0.7, seed: 700 + i, tin: 0.05, tout: 0.45 }); }
      s.save(); s.globalCompositeOperation = "destination-out"; for (let i = 0; i < 16; i++) { const x = 120 + r() * 800, y = Math.max(stairY(x), 1200) + 60 + r() * 420, Ls = 120 + r() * 200; dryStroke(s, [[x, y], [x - Ls * 0.5, y + Ls * 0.3], [x - Ls, y + Ls * 0.62]], { width: 14 + r() * 26, color: "#000", alpha: 0.5, dry: 0.9, seed: 900 + i, tin: 0.1, tout: 0.4, density: 0.5 }); } s.restore(); } });
  dryStroke(near.g, top, { width: 9, color: INK[0], alpha: 0.92, dry: 0.3, seed: 52, tin: 0.003, tout: 0.003, density: 1.1 });
  near.g.strokeStyle = PAPER; near.g.lineWidth = 2; near.g.globalAlpha = 0.24;
  for (let i = 1; i <= 13; i++) { const x = STAIR.x0 + i * STAIR.w, y = STAIR.y0 - i * STAIR.h; near.g.beginPath(); near.g.moveTo(x - STAIR.w + 8, y + 5); near.g.lineTo(x - 3, y + 5); near.g.stroke(); }
  near.g.globalAlpha = 1;
  for (let i = 0; i < 10; i++) tuft(near.g, 30 + i * 13, 1622 - i * 4, 8, 44, 80 + i);
  for (let i = 0; i < 8; i++) tuft(near.g, 850 + i * 30, 1192 - i * 6, 8, 40, 90 + i);
  rock(near.g, 940, 1186, 190, 120, 55, 2);
  rock(fg.g, 1010, 1850, 420, 330, 57, 1);
  for (let i = 0; i < 9; i++) tuft(fg.g, 800 + i * 24, 1790 + (i % 3) * 14, 9, 80, 120 + i);
  return { far, mid, near, fg, blades: makeBlades(5, 26, 720, 1090, 1800, 110, 260) };
}
function drawS01(g, t) {
  const sh = SHOTS[0], lt = t - sh.start, k = smooth(lt / (sh.end - sh.start)), c = { fx: 720, fy: 640, z: 0.06 * k, ty: 44 * k }, P = PL.s01;
  g.drawImage(K.PAPER.c, 0, 0);
  layer(g, P.far, c, 0.05);
  mist(g, t, 730, 330, 0.8, 13, 0);
  layer(g, P.mid, c, 0.32);
  g.save(); cam(g, c, 0.32);
  boughs(g, t, [[0, 650, 392, 0.52, PI + 0.1, 0], [1, 716, 414, 0.4, -0.75, 1.3], [2, 872, 356, 0.36, -0.2, 2.2], [1, 950, 502, 0.36, 0.05, 3.1], [2, 806, 470, 0.34, PI - 0.5, 4]]);
  inkFigure(g, (f) => seatedBack(f, 742, 650, 0.28, { t, shade: true }), { bleed: 1.4, soft: 0.4, tooth: 0.06 });
  g.restore();
  mist(g, t, 1010, 420, 0.85, -20, 1);
  mist(g, t, 1230, 360, 0.6, 28, 2);
  petals(g, t, 0, 0.3);
  layer(g, P.near, c, 0.78);
  g.save(); cam(g, c, 0.78);
  const xs = lerp(318, 458, clamp(lt / 3.4, -0.2, 1.2)), ys = stairY(xs) + 2;
  inkFigure(g, (f) => swordsmanBack(f, xs, ys, 0.9, { t, walk: (PI * (xs - 318)) / STAIR.w }), { sun: [730, 548, 900], lit: 0.2 });
  g.restore();
  mist(g, t, 1600, 380, 0.5, 44, 0);
  petals(g, t, 1, 0.2);
  layer(g, P.fg, c, 1);
  g.save(); cam(g, c, 1); grassBlades(g, t, P.blades); bough(g, 0, -40, 250, 1.25, 0.42, 1, t, 0.7); bough(g, 2, -30, 40, 1.0, 0.2, 1, t, 2); g.restore();
  petals(g, t, 2, 0.1);
}

// ── s02: the master ─────────────────────────────────────────────────────────
function bakeS02() {
  const far = cv(), mid = cv(), near = cv();
  glow(far.g, 930, 860, 150, 0.6);
  sun(far.g, 930, 860, 150, 0.8, 201);
  mountain(far.g, { seed: 21, base: 1190, height: 250, peaks: 5, pw: 200, tone: 6, alpha: 0.55, band: 200, strokes: 10 });
  haze(far.g, 1040, 1280, 0.6);
  mountain(far.g, { seed: 22, base: 1330, height: 270, peaks: 4, pw: 220, tone: 5, alpha: 0.62, band: 220, strokes: 16, dots: 80 });
  haze(far.g, 1200, 1440, 0.55);
  ground(mid.g, [[-60, 1440], [200, 1446], [420, 1438], [700, 1456], [1150, 1466]], { tone: 5, alpha: 0.5, seed: 23, strokes: 8, tufts: 12, grassH: 22, edge: 6, stones: 3, depth: 200 });
  ground(near.g, [[-60, 1524], [180, 1500], [420, 1516], [640, 1504], [860, 1520], [1150, 1498]], { tone: 4, alpha: 0.66, seed: 24, strokes: 20, tufts: 26, grassH: 44, stones: 6 });
  rock(near.g, 990, 1500, 170, 100, 25, 2);
  trunk(near.g, [[104, 1590], [96, 1300], [150, 1050], [88, 800], [140, 520], [62, 250], [92, -60]], 132, 86, 26, 1);
  trunk(near.g, [[128, 640], [330, 548], [560, 524], [800, 468], [1010, 496]], 36, 9, 27, 1);
  trunk(near.g, [[110, 330], [300, 250], [520, 262], [700, 200]], 28, 8, 28, 1);
  return { far, mid, near, blades: makeBlades(8, 30, -20, 1100, 1905, 130, 330) };
}
function drawS02(g, t) {
  const sh = SHOTS[1], lt = t - sh.start, k = smooth(lt / (sh.end - sh.start)), c = { fx: 700, fy: 1000, z: 0.065 * k }, P = PL.s02;
  g.drawImage(K.PAPER.c, 0, 0);
  layer(g, P.far, c, 0.05);
  mist(g, t, 1010, 330, 0.8, 15, 1);
  mist(g, t, 1180, 300, 0.7, -22, 2);
  petals(g, t, 0, 0.3, null, 1);
  layer(g, P.mid, c, 0.45);
  g.save(); cam(g, c, 0.45);
  // he comes up from behind the pine, stops, and his hand goes to the hilt
  const wk = ramp(lt, -0.4, 1.8), xw = lerp(150, 322, wk), stride = 1 - ramp(lt, 1.4, 1.85), reach = ramp(lt, 1.95, 2.6);
  const rest = [12 + Math.sin(wk * 8 * PI) * 14 * stride, -204], hilt = [35.3, -236.1];
  inkFigure(g, (f) => swordsmanSide(f, xw, 1448, 1.0, { t, walk: wk * 8 * PI, stride, hand: [lerp(rest[0], hilt[0], reach), lerp(rest[1], hilt[1], reach)], lean: 0.04 + 0.05 * reach, crouch: 5 * reach }), { haze: 0.16, sun: [930, 860, 1000], lit: 0.22 });
  g.restore();
  mist(g, t, 1290, 280, 0.45, 30, 0);
  layer(g, P.near, c, 0.82);
  g.save(); cam(g, c, 0.82);
  boughs(g, t, [[0, 330, 552, 0.95, 0.5, 0], [1, 560, 528, 0.9, 0.42, 1.1], [2, 790, 474, 0.85, 0.5, 2.3], [0, 1000, 500, 0.7, 0.3, 3.4], [1, 300, 250, 0.9, 0.1, 4.2], [2, 520, 262, 0.85, -0.1, 5]]);
  g.fillStyle = "rgba(15,13,11,0.3)"; g.filter = "blur(12px)"; g.beginPath(); g.ellipse(740, 1516, 300, 18, 0, 0, TAU); g.fill(); g.filter = "none";
  inkFigure(g, (f) => masterSide(f, 712, 1512, 1.92, { t }), { sun: [930, 860, 900], lit: 0.14, tooth: 0.1 });
  g.restore();
  g.save(); cam(g, c, 1); grassBlades(g, t, P.blades); g.restore();
  petals(g, t, 1, 0.24, null, 1);
  petals(g, t, 2, 0.1, null, 1);
}

// ── s03: the draw ───────────────────────────────────────────────────────────
function bakeS03() {
  const far = cv(), mid = cv();
  glow(far.g, 880, 760, 150, 0.62);
  sun(far.g, 880, 760, 150, 0.84, 301);
  mountain(far.g, { seed: 31, base: 1240, height: 260, peaks: 5, pw: 210, tone: 6, alpha: 0.5, band: 200, strokes: 10 });
  haze(far.g, 1080, 1320, 0.6);
  mountain(far.g, { seed: 32, base: 1400, height: 280, peaks: 4, pw: 230, tone: 5, alpha: 0.56, band: 230, strokes: 14, dots: 70 });
  haze(far.g, 1260, 1500, 0.55);
  ground(mid.g, [[-60, 1590], [300, 1580], [640, 1572], [900, 1566], [1150, 1574]], { tone: 5, alpha: 0.5, seed: 33, strokes: 12, tufts: 12, grassH: 26, edge: 6, stones: 4, depth: 320 });
  trunk(mid.g, [[1030, 1590], [1040, 1380], [1000, 1200], [1050, 1000], [1004, 800], [1060, 560], [1010, 300], [1070, 60]], 50, 34, 36, -1);
  trunk(mid.g, [[1044, 250], [900, 160], [740, 150], [560, 80]], 22, 6, 38, -1);
  mid.g.filter = "blur(1.6px)"; mid.g.globalCompositeOperation = "copy"; mid.g.drawImage(mid.c, 0, 0); mid.g.filter = "none"; mid.g.globalCompositeOperation = "source-over";
  return { far, mid };
}
/** The draw, as numbers. q: how far the guard has left the scabbard's mouth; u: the swing once the point is free. */
function drawPose(t) {
  const A0 = (-20 * PI) / 180, A1 = (-40 * PI) / 180, ax = Math.cos(A0), ay = Math.sin(A0);
  const push = ramp(t, 6.45, 6.9) * 9, pull = ramp(t, DRUM - 0.05, DRUM + 0.1), q = push + (91 - 9) * pull * pull, sayaNow = pull * (1 - 0.5 * ramp(t, DRUM + 0.4, DRUM + 1.4));
  const u = clamp((t - (DRUM + 0.1)) / 0.09), tau = Math.max(0, t - (DRUM + 0.19));
  const M = [24 - ax * 60 * pull, -232 - ay * 60 * pull], hq = [M[0] + ax * (12 + q), M[1] + ay * (12 + q)], end = [106, -352];
  if (u <= 0) return { hand: hq, sword: { pos: hq, ang: A0 + PI, len: 1, free: false }, saya: pull, u, tau };
  const e = smooth(u), pos = [lerp(hq[0], end[0], e), lerp(hq[1], end[1], e)];
  const settle = u >= 1 ? 0.16 * Math.exp(-7 * tau) * Math.cos(17 * tau) + 0.01 * Math.sin(t * 9) * Math.exp(-tau * 0.8) : 0;     // the steel rings, then is still
  return { hand: pos, sword: { pos, ang: lerp(A0, A1, e) + settle, len: -Math.cos(PI * u), free: true }, saya: sayaNow, u, tau };
}
function drawS03(g, t) {
  const sh = SHOTS[2], lt = t - sh.start, k = smooth(lt / (sh.end - sh.start)), P = PL.s03;
  const punch = 1 - Math.pow(1 - clamp((t - DRUM) / 0.14), 3);                  // the film's one fast punch-in, on the drum
  const c = { fx: 600, fy: 980, z: 0.03 * k + 0.085 * punch + 0.02 * ramp(t, DRUM + 0.14, sh.end) };
  const pose = drawPose(t);
  g.drawImage(K.PAPER.c, 0, 0);
  layer(g, P.far, c, 0.05);
  mist(g, t, 1070, 330, 0.8, 16, 2);
  mist(g, t, 1260, 320, 0.7, -24, 0);
  petals(g, t, 0, 0.32, null, 2);
  layer(g, P.mid, c, 0.4);
  g.save(); cam(g, c, 0.4);
  boughs(g, t, [[0, 900, 162, 0.9, PI - 0.35, 4.4], [1, 740, 152, 0.85, PI - 0.5, 5.1], [2, 570, 82, 0.8, PI - 0.3, 5.9], [2, 1050, 1240, 0.5, PI + 0.5, 2.4]]);
  inkFigure(g, (f) => masterSide(f, 846, 1576, 0.74, { t }), { haze: 0.2, bleed: 4, soft: 1.5, sun: [880, 760, 700], lit: 0.2 });
  g.restore();
  mist(g, t, 1380, 330, 0.62, 34, 1);
  petals(g, t, 1, 0.24, null, 2);
  g.save(); cam(g, c, 1);
  const whip = 1 + 3.2 * Math.exp(-2.6 * pose.tau) * (pose.u > 0 ? 1 : 0) + 0.8 * ramp(t, 6.5, 6.95) * (pose.u > 0 ? 0 : 1);
  if (pose.u > 0) {    // a splash of ink and one dry crescent where the steel went
    const a = Math.exp(-pose.tau * 2.4), grow = 0.55 + 0.45 * (1 - Math.exp(-pose.tau * 16));
    g.save(); g.translate(352, 1330); g.scale(grow * 1.05, grow * 1.05); g.globalAlpha = 0.9 * a; g.drawImage(K.SLASH.c, -40, -470); g.globalAlpha = 0.95 * Math.min(1, a * 1.5); g.drawImage(K.SPLASH.c, -60, -440); g.restore();
  }
  const FX = 268, FY = 2140, SC = 3.4;
  inkFigure(g, (f) => swordsmanSide(f, FX, FY, SC, { t, hand: pose.hand, sword: pose.sword, saya: pose.saya, lean: 0.09 - 0.05 * clamp(pose.u), crouch: 7 * ramp(t, 6.45, 6.95) * (1 - ramp(t, DRUM + 0.1, DRUM + 0.5)), bow: 0.1 * ramp(t, 6.45, 6.95) - 0.1 * clamp(pose.u), whip }), { sun: [880, 760, 1300], lit: 0.2, bleed: 5, soft: 0.9, tooth: 0.2 });
  if (pose.u >= 1) {   // a glint that runs down the steel once it is out
    const gl = mod((t - DRUM - 0.3) / 1.5, 1), ga = Math.sin(PI * gl) * ramp(t, DRUM + 0.3, DRUM + 0.5), d = [Math.cos(pose.sword.ang), Math.sin(pose.sword.ang)], L = (20 + gl * 120) * SC;
    const gx = FX + pose.sword.pos[0] * SC + d[0] * L, gy = FY + pose.sword.pos[1] * SC + d[1] * L, gr = g.createRadialGradient(gx, gy, 0, gx, gy, 26);
    gr.addColorStop(0, `rgba(255,252,240,${0.95 * ga})`); gr.addColorStop(0.3, `rgba(255,252,240,${0.5 * ga})`); gr.addColorStop(1, "rgba(255,252,240,0)"); g.fillStyle = gr; g.fillRect(gx - 30, gy - 30, 60, 60);
  }
  g.restore();
  petals(g, t, 2, 0.1, null, 2);
}

// ── s04: the turn ───────────────────────────────────────────────────────────
function bakeS04() {
  const far = cv(), mid = cv(), fg = cv();
  glow(far.g, 560, 1090, 175, 0.66);
  sun(far.g, 560, 1090, 175, 0.86, 401);
  mountain(far.g, { seed: 41, base: 1400, height: 260, peaks: 5, pw: 200, tone: 6, alpha: 0.5, band: 190, strokes: 10 });
  haze(far.g, 1240, 1470, 0.6);
  mountain(far.g, { seed: 42, base: 1500, height: 230, peaks: 4, pw: 220, tone: 5, alpha: 0.56, band: 200, strokes: 14, dots: 70 });
  haze(far.g, 1360, 1560, 0.5);
  ground(mid.g, [[-60, 1520], [200, 1498], [480, 1512], [760, 1496], [1000, 1508], [1150, 1516]], { tone: 4, alpha: 0.66, seed: 43, strokes: 20, tufts: 24, grassH: 34, stones: 6 });
  trunk(mid.g, [[1004, 1530], [1014, 1300], [962, 1100], [1022, 880], [952, 660], [1002, 430], [912, 200], [960, -40]], 86, 46, 45, -1);
  trunk(mid.g, [[972, 610], [790, 510], [570, 498], [370, 430], [180, 446]], 28, 7, 46, -1);
  trunk(mid.g, [[996, 330], [830, 230], [650, 220], [470, 160]], 22, 6, 47, -1);
  rock(fg.g, 70, 1890, 440, 280, 48, 1);
  for (let i = 0; i < 8; i++) tuft(fg.g, 40 + i * 30, 1810 + (i % 3) * 12, 9, 86, 140 + i);
  return { far, mid, fg, blades: makeBlades(9, 22, -20, 360, 1840, 110, 280) };
}
function drawS04(g, t) {
  const sh = SHOTS[3], lt = t - sh.start, k = smooth(lt / (sh.end - sh.start)), c = { fx: 560, fy: 1120, z: 0.055 * k }, P = PL.s04;
  const low = ramp(t, TURN - 0.05, TURN + 1.25);                                  // the blade sinks
  g.drawImage(K.PAPER.c, 0, 0);
  layer(g, P.far, c, 0.05);
  mist(g, t, 1220, 300, 0.8, 16, 0);
  petals(g, t, 0, 0.9, 9.35, 3);
  mist(g, t, 1350, 280, 0.6, -22, 1);
  layer(g, P.mid, c, 0.6);
  g.save(); cam(g, c, 0.6);
  boughs(g, t, [[0, 790, 512, 0.8, PI - 0.3, 0], [1, 570, 500, 0.8, PI - 0.5, 1.2], [2, 370, 432, 0.75, PI - 0.4, 2.1], [0, 196, 446, 0.6, PI - 0.2, 3.3], [1, 830, 232, 0.7, PI + 0.1, 4.1], [2, 660, 222, 0.6, PI - 0.1, 5.2], [0, 480, 162, 0.6, PI - 0.3, 6]]);
  g.fillStyle = "rgba(15,13,11,0.3)"; g.filter = "blur(11px)"; g.beginPath(); g.ellipse(880, 1512, 220, 15, 0, 0, TAU); g.fill(); g.beginPath(); g.ellipse(232, 1512, 150, 13, 0, 0, TAU); g.fill(); g.filter = "none";
  inkFigure(g, (f) => masterSide(f, 858, 1508, 1.32, { t }), { sun: [560, 1090, 700], lit: 0.12, tooth: 0.1 });
  const trem = (1 - low) * (Math.sin(t * 23) * 0.006 + Math.sin(t * 37 + 1) * 0.004);
  const hand = [lerp(104, 40, low), lerp(-284, -206, low)], ang = lerp(0.05, 1.2, low) + trem;
  const r = inkFigure(g, (f) => swordsmanSide(f, 232, 1506, 1.62, { t, hand, sword: { pos: hand, ang, len: 1, free: true }, saya: 0.3, lean: lerp(0.07, 0.0, low), bow: 0.26 * low, crouch: 4 * low, whip: 1 }), { sun: [560, 1090, 800], lit: 0.22 });
  g.restore();
  // one petal comes to rest on the steel just before it gives way
  { const land = TURN - 0.25, a = clamp((t - (land - 1.3)) / 1.3), bx = lerp(r.grip[0], r.tip[0], 0.62), by = lerp(r.grip[1], r.tip[1], 0.62) - 6, e = 1 - Math.pow(1 - a, 2);
    const px = bx + (1 - e) * 150 + Math.sin(a * 9) * 22 * (1 - a), py = by - (1 - e) * 620;
    if (t > land - 1.3) { g.save(); g.translate(px, py); g.rotate((1 - a) * 5 + 0.3 + (a >= 1 ? ang : 0)); g.scale(0.78, 0.78 * (a >= 1 ? 0.5 : Math.max(0.2, Math.abs(Math.cos(a * 11))))); g.drawImage(K.PETSPR[0].c, -32, -32); g.restore(); } }
  mist(g, t, 1640, 380, 0.5, 34, 2);
  petals(g, t, 1, 0.95, 9.3, 3);
  layer(g, P.fg, c, 1);
  g.save(); cam(g, c, 1); grassBlades(g, t, P.blades); g.restore();
  petals(g, t, 2, 0.7, 9.45, 3);
}

// ── s05: they sit ───────────────────────────────────────────────────────────
function bakeS05() {
  const far = cv(), near = cv();
  glow(far.g, 540, 716, 215, 0.9);
  sun(far.g, 540, 716, 215, 0.95, 501);
  mountain(far.g, { seed: 51, base: 1130, height: 210, peaks: 5, pw: 200, tone: 6, alpha: 0.5, band: 180, strokes: 10 });
  haze(far.g, 1000, 1220, 0.6);
  mountain(far.g, { seed: 52, base: 1260, height: 240, peaks: 4, pw: 220, tone: 5, alpha: 0.58, band: 200, strokes: 14, dots: 70 });
  haze(far.g, 1140, 1340, 0.55);
  mountain(far.g, { seed: 53, base: 1400, height: 250, peaks: 4, pw: 240, tone: 4, alpha: 0.64, band: 230, strokes: 20, dots: 110 });
  haze(far.g, 1280, 1500, 0.5);
  ground(near.g, [[-60, 1520], [250, 1498], [540, 1514], [830, 1496], [1150, 1510]], { tone: 4, alpha: 0.66, seed: 54, strokes: 20, tufts: 22, grassH: 40, stones: 5 });
  trunk(near.g, [[1012, 1570], [992, 1300], [1042, 1050], [972, 800], [1022, 560], [932, 330], [820, 190]], 120, 62, 55, -1);
  trunk(near.g, [[962, 372], [780, 254], [560, 232], [340, 282], [140, 250]], 32, 7, 56, -1);
  trunk(near.g, [[1000, 700], [900, 640], [800, 650]], 16, 5, 57, -1);
  { const g = near.g, pts = spline([[52, 1676], [170, 1664], [300, 1648]], 6);     // the sword, laid down
    g.fillStyle = "rgba(15,13,11,0.34)"; g.filter = "blur(7px)"; g.beginPath(); g.ellipse(210, 1676, 190, 11, -0.1, 0, TAU); g.fill(); g.filter = "none";
    g.fillStyle = INK[0]; g.globalAlpha = 0.97; ribbon(g, pts, (s) => lerp(8, 9.5, s)); g.fill(); g.strokeStyle = PAPER; g.globalAlpha = 0.42; g.lineWidth = 1.8; g.beginPath(); trace(g, pts.map((p) => [p[0], p[1] - 3.5])); g.stroke();
    g.globalAlpha = 1; g.strokeStyle = INK[0]; g.lineCap = "round"; g.lineWidth = 12; g.beginPath(); g.moveTo(308, 1647); g.lineTo(372, 1638); g.stroke(); g.fillStyle = INK[0]; g.beginPath(); g.ellipse(304, 1648, 5, 18, -0.15, 0, TAU); g.fill();
    g.strokeStyle = PAPER; g.globalAlpha = 0.3; g.lineWidth = 1.4; for (let i = 0; i < 6; i++) { g.beginPath(); g.moveTo(314 + i * 10, 1652 - i * 1.4); g.lineTo(320 + i * 10, 1640 - i * 1.4); g.stroke(); } g.globalAlpha = 1; }
  return { far, near, blades: makeBlades(12, 26, 430, 1100, 1905, 120, 330) };
}
function drawS05(g, t) {
  const sh = SHOTS[4], lt = t - sh.start, k = smooth(lt / 2.2), c = { fx: 540, fy: 900, z: 0.05 * k }, P = PL.s05;
  g.drawImage(K.PAPER.c, 0, 0);
  layer(g, P.far, c, 0.05);
  mist(g, t, 960, 300, 0.7, 14, 1);
  mist(g, t, 1110, 300, 0.65, -20, 2);
  petals(g, t, 0, 0.55, null, 4);
  mist(g, t, 1250, 300, 0.6, 26, 0);
  layer(g, P.near, c, 0.85);
  g.save(); cam(g, c, 0.85);
  boughs(g, t, [[0, 780, 256, 0.95, PI - 0.5, 0], [1, 560, 234, 0.95, PI - 0.6, 1.2], [2, 340, 284, 0.9, PI - 0.5, 2.1], [0, 150, 252, 0.7, PI - 0.3, 3.3], [1, 800, 652, 0.55, PI - 0.2, 4.1], [2, 960, 380, 0.7, PI + 0.7, 5.2]]);
  g.fillStyle = "rgba(15,13,11,0.32)"; g.filter = "blur(14px)"; g.beginPath(); g.ellipse(702, 1568, 250, 20, 0, 0, TAU); g.fill(); g.beginPath(); g.ellipse(362, 1582, 230, 18, 0, 0, TAU); g.fill(); g.filter = "none";
  const settle = 1 - ramp(lt, -0.1, 1.15);
  inkFigure(g, (f) => seatedBack(f, 702, 1562, 1.72, { t }), { sun: [540, 716, 900], lit: 0.1, tooth: 0.1 });
  inkFigure(g, (f) => seatedBack(f, 362, 1576, 1.66, { t, dark: true, rise: settle, nod: 0.12 * settle - 0.04 * ramp(lt, 1.2, 2.4) }), { sun: [540, 716, 1000], lit: 0.24, tooth: 0.2 });
  g.restore();
  petals(g, t, 1, 0.6, null, 4);
  { const a = clamp((t - SEAL_AT) / 0.1), s = 1 + 0.3 * (1 - smooth(a));     // the seal lands
    if (a > 0) { g.save(); g.translate(132, 1336); g.rotate(-0.04); g.scale(s * 0.78, s * 0.78); g.globalAlpha = a * 0.94; g.globalCompositeOperation = "multiply"; g.drawImage(K.SEAL.c, -70, -70); g.restore(); } }
  g.save(); cam(g, c, 1); grassBlades(g, t, P.blades); g.restore();
  petals(g, t, 2, 0.3, null, 4);
}
const DRAW = [drawS01, drawS02, drawS03, drawS04, drawS05];

async function bake() {
  initInk();
  TB = cv(); MB = cv(270, 480); MI = cv(270, 480);
  for (const c of CUTS) FIELD[c.f] = makeField(c.kind, c.f);
  PL.s01 = bakeS01(); PL.s02 = bakeS02(); PL.s03 = bakeS03(); PL.s04 = bakeS04(); PL.s05 = bakeS05();
}

const canvas = document.getElementById("c");
const ctx = canvas.getContext("2d");

function drawShot(g, i, t) {
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = "source-over"; g.filter = "none";
  DRAW[i](g, t);
  g.restore();
}
/** Joins two shots with spreading ink (or a dry brush dragged across): never a plain crossfade. */
function masks(cut, p) {
  const f = FIELD[cut.f], w = 270, h = 480, q = p * 1.4, a = MB.g.createImageData(w, h), b = MI.g.createImageData(w, h), brush = cut.kind === "brush";
  for (let i = 0, j = 0; i < f.length; i++, j += 4) {
    const e = q - f[i], vis = smooth((e - 0.05) / (brush ? 0.07 : 0.15)), ink = smooth(e / (brush ? 0.025 : 0.05)) * (1 - smooth((e - 0.05) / (brush ? 0.12 : 0.22)));
    a.data[j + 3] = vis * 255;
    b.data[j] = 22; b.data[j + 1] = 19; b.data[j + 2] = 16; b.data[j + 3] = ink * (brush ? 215 : 235);
  }
  MB.g.putImageData(a, 0, 0); MI.g.putImageData(b, 0, 0);
}
function seek(t) {
  t = clamp(t, 0, DURATION - 1e-6);
  const i = SHOTS.findIndex((s) => t >= s.start && t < s.end);
  const cut = CUTS.find((c) => t > c.at - 0.3 && t < c.at + 0.24);
  if (!cut) drawShot(ctx, i, t);
  else {
    const p = (t - (cut.at - 0.3)) / 0.54, ai = CUTS.indexOf(cut);
    drawShot(ctx, ai, t);
    drawShot(TB.g, ai + 1, t);
    masks(cut, p);
    const b = TB.g; b.save(); b.setTransform(1, 0, 0, 1, 0, 0); b.imageSmoothingEnabled = true; b.imageSmoothingQuality = "high"; b.globalCompositeOperation = "destination-in"; b.drawImage(MB.c, 0, 0, W, H); b.restore();
    ctx.save(); ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = "high";
    ctx.drawImage(TB.c, 0, 0);
    ctx.globalCompositeOperation = "multiply"; ctx.drawImage(MI.c, 0, 0, W, H);
    ctx.restore();
  }
  // Finish: the paper's tooth over the ink, and a breath of vignette. Nothing else.
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = "soft-light"; ctx.globalAlpha = 0.42; ctx.fillStyle = ctx.createPattern(K.GRAINT.c, "repeat"); ctx.fillRect(0, 0, W, H);
  ctx.globalCompositeOperation = "multiply"; ctx.globalAlpha = 1;
  const v = ctx.createRadialGradient(W / 2, H * 0.46, H * 0.34, W / 2, H * 0.46, H * 0.76); v.addColorStop(0, "rgba(90,70,44,0)"); v.addColorStop(1, "rgba(90,70,44,0.22)");
  ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

window.film = { duration: DURATION, fps: FPS, width: W, height: H, shots: SHOTS.map(({ id, start, end }) => ({ id, start, end })), ready: bake().then(() => seek(0)), seek };
