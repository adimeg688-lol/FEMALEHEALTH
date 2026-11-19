/**
 * The two men. The swordsman is ink: a dark silhouette with the paper showing where the brush ran dry,
 * and the film's one colour at his waist. The master is line and pale wash, nearly the colour of the mist.
 * Every pose is a function of the numbers passed in; cloth and hair are travelling waves in t.
 */
import { W, H, PI, TAU, clamp, lerp, PAPER, VERM, VERM_D, INK, K, spline, trace, blob, rpoly, ribbon, contour, strand, feibai } from "./ink.js";

/**
 * Paints a figure on its own sheet, lets the paper's tooth and the light eat into the ink, then lays it on the
 * picture with a soft wet halo. `fn` draws in the picture's own coordinates.
 */
export function inkFigure(g, fn, o = {}) {
  const f = K.FIG.g;
  f.setTransform(1, 0, 0, 1, 0, 0); f.globalCompositeOperation = "source-over"; f.globalAlpha = 1; f.filter = "none"; f.clearRect(0, 0, W, H);
  f.save(); f.setTransform(g.getTransform()); const ret = fn(f); f.restore();
  f.globalCompositeOperation = "destination-out"; f.globalAlpha = o.tooth ?? 0.16; f.fillStyle = K.PAT.grain; f.fillRect(0, 0, W, H);
  if ((o.streak ?? 0) > 0) { f.globalAlpha = o.streak ?? 0; f.fillStyle = K.PAT.streak; f.fillRect(0, 0, W, H); }
  if (o.sun) { const [sx, sy, R] = o.sun, gr = f.createRadialGradient(sx, sy, 0, sx, sy, R); gr.addColorStop(0, `rgba(0,0,0,${o.lit ?? 0.3})`); gr.addColorStop(1, "rgba(0,0,0,0)"); f.globalAlpha = 1; f.fillStyle = gr; f.fillRect(0, 0, W, H); }
  f.globalCompositeOperation = "source-over"; f.globalAlpha = 1;
  const a = 1 - (o.haze ?? 0);
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
  g.filter = `blur(${o.bleed ?? 3.5}px)`; g.globalAlpha = 0.42 * a; g.drawImage(K.FIG.c, 0, 0);
  g.filter = `blur(${o.soft ?? 0.6}px)`; g.globalAlpha = a; g.drawImage(K.FIG.c, 0, 0);
  g.restore();
  return ret;
}
const toScreen = (g, x, y) => { const m = g.getTransform(); return [m.a * x + m.c * y + m.e, m.b * x + m.d * y + m.f]; };
const sashTail = (g, pts, w) => { ribbon(g, pts, (s) => w * (0.5 + 0.65 * Math.sin(PI * Math.min(1, s * 1.12)))); g.fill(); };

/**
 * The swordsman in profile, facing right. Units: he stands 410 tall, feet at y = 0.
 * P: t, walk (phase), stride 0..1, lean, crouch, bow, hand [x, y] (where the near hand goes),
 *    sword { pos: [x, y] of the grip, ang, len -1..1 of 150, free }, saya 0..1 (scabbard pulled back), whip.
 */
export function swordsmanSide(g, x, y, sc, P) {
  const t = P.t, ph = P.walk ?? 0, st = P.stride ?? 0, whip = P.whip ?? 1;
  const A0 = (-20 * PI) / 180, ax = Math.cos(A0), ay = Math.sin(A0), saya = P.saya ?? 0, M = [24 - ax * 60 * saya, -232 - ay * 60 * saya];
  const sw = P.sword ?? { pos: [M[0] + ax * 12, M[1] + ay * 12], ang: A0 + PI, len: 1, free: false };
  const hand = P.hand ?? sw.pos, lean = P.lean ?? 0.04;
  g.save(); g.translate(x, y); g.scale(sc, sc); g.translate(0, -Math.abs(Math.sin(ph)) * 5 * st + (P.crouch ?? 0));
  const f1 = lerp(44, 56 * Math.cos(ph), st), f2 = lerp(-48, -56 * Math.cos(ph), st), l1 = Math.max(0, Math.sin(ph)) * 16 * st, l2 = Math.max(0, -Math.sin(ph)) * 16 * st;
  const upper = () => { g.translate(0, -236); g.rotate(lean); g.translate(0, 236); };
  let tip = [0, 0], grip = [0, 0];
  const drawSword = () => {
    const dx = Math.cos(sw.ang), dy = Math.sin(sw.ang), gx = sw.pos[0] + dx * 9, gy = sw.pos[1] + dy * 9, L = sw.len * 150, px = -dy, py = dx;
    if (Math.abs(L) > 1) {
      const pts = []; for (let i = 0; i <= 14; i++) { const u = i / 14, bw = Math.sin(PI * u) * 3.2 * Math.sign(L); pts.push([gx + dx * L * u + px * bw, gy + dy * L * u + py * bw]); }
      g.fillStyle = INK[0]; g.globalAlpha = 0.96; ribbon(g, pts, (s) => 3.4 * Math.min(1, (1 - s) / 0.1)); g.fill();
      g.strokeStyle = PAPER; g.globalAlpha = 0.85; g.lineWidth = 1.5; g.lineCap = "round"; g.beginPath(); pts.forEach((p, i) => { if (i < 14) { i ? g.lineTo(p[0] - px * 0.9, p[1] - py * 0.9) : g.moveTo(p[0] - px * 0.9, p[1] - py * 0.9); } }); g.stroke();
      tip = toScreen(g, pts[14][0], pts[14][1]); grip = toScreen(g, gx, gy);
    }
    g.globalAlpha = 1; g.strokeStyle = INK[0]; g.lineCap = "round"; g.lineWidth = 7.5; g.beginPath(); g.moveTo(sw.pos[0] - dx * 21, sw.pos[1] - dy * 21); g.lineTo(gx, gy); g.stroke();
    g.strokeStyle = PAPER; g.globalAlpha = 0.34; g.lineWidth = 0.9; for (let i = 0; i < 6; i++) { const u = -19 + i * 5; g.beginPath(); g.moveTo(sw.pos[0] + dx * u - px * 3, sw.pos[1] + dy * u - py * 3); g.lineTo(sw.pos[0] + dx * (u + 3) + px * 3, sw.pos[1] + dy * (u + 3) + py * 3); g.stroke(); }
    g.globalAlpha = 1; g.fillStyle = INK[0]; g.beginPath(); g.ellipse(gx, gy, 3, 10.5, sw.ang, 0, TAU); g.fill();
    g.strokeStyle = PAPER; g.globalAlpha = 0.3; g.lineWidth = 0.9; g.beginPath(); g.ellipse(gx, gy, 2, 9, sw.ang, -1.2, 1.2); g.stroke(); g.globalAlpha = 1;
  };
  // the sash, behind everything: the film's one colour on him
  g.save(); upper();
  g.fillStyle = VERM;
  for (const [len, amp, phs, w] of [[104, 13, 0, 5.6], [78, 10, 1.9, 4.6]]) { g.globalAlpha = 0.92; sashTail(g, strand(-36, -241, PI - 0.08, len, t, { amp: amp * whip, speed: 6.2, phase: phs, droop: 0.2, freq: 1.25 }), w); }
  g.restore();
  if (!sw.free) drawSword();
  // the scabbard, tucked through the sash on the far hip
  { const e = [M[0] - ax * 178, M[1] - ay * 178 + 6], pts = spline([M, [(M[0] + e[0]) / 2, (M[1] + e[1]) / 2 + 5], e], 8); g.fillStyle = INK[0]; g.globalAlpha = 0.97; ribbon(g, pts, (s) => lerp(5.6, 4.4, s)); g.fill(); g.strokeStyle = PAPER; g.globalAlpha = 0.3; g.lineWidth = 1.1; g.beginPath(); trace(g, pts.map((p) => [p[0], p[1] - 2.2])); g.stroke(); g.globalAlpha = 1; }
  // hakama: a mid wash with dark pleats and dry streaks
  rpoly(g, [[-38, -238, 3], [36, -238, 3], [47, -150, 30], [f1 + 46, -15 - l1, 5], [f1 - 26, -7 - l1, 5], [(f1 + f2) / 2 + 4, -82 - 14 * st, 14], [f2 + 30, -7 - l2, 5], [f2 - 44, -15 - l2, 5], [-52, -150, 30]]);
  g.fillStyle = INK[3]; g.globalAlpha = 0.95; g.fill();
  const lg = g.createLinearGradient(-60, 0, 80, 0); lg.addColorStop(0, "rgba(15,13,11,0.62)"); lg.addColorStop(0.75, "rgba(15,13,11,0.04)"); g.fillStyle = lg; g.globalAlpha = 1; g.fill();
  for (const [a, b, w] of [[[12, -236], [f1 + 10, -11 - l1], 2.6], [[25, -236], [f1 + 30, -13 - l1], 2], [[-2, -236], [f1 - 12, -9 - l1], 1.8], [[-10, -236], [f2 + 10, -9 - l2], 2.6], [[-24, -236], [f2 - 16, -11 - l2], 2.2], [[-33, -236], [f2 - 34, -13 - l2], 1.6]])
    contour(g, spline([a, [(a[0] + b[0]) / 2 + 3, (a[1] + b[1]) / 2], b], 8), w * 1.9, a[0], INK[0], 0.85);
  feibai(g, spline([[30, -226], [42, -130], [f1 + 38, -24 - l1]], 6), 13, 0.5, 21, sc);
  feibai(g, spline([[4, -226], [8, -130], [f1 - 2, -20 - l1]], 6), 9, 0.36, 22, sc);
  feibai(g, spline([[-18, -226], [-26, -130], [f2 - 6, -22 - l2]], 6), 10, 0.3, 23, sc);
  g.fillStyle = INK[0]; g.globalAlpha = 0.97;
  for (const [fx, l] of [[f1, l1], [f2, l2]]) { rpoly(g, [[fx - 14, -9 - l], [fx + 30, -8 - l, 4], [fx + 40, 0 - l, 3], [fx - 14, 1 - l, 2]], 3); g.fill(); }
  // the upper body
  g.save(); upper();
  const torso = [[0, -349], [-22, -341], [-37, -316], [-41, -280], [-37, -250], [-38, -232], [38, -232], [40, -252], [46, -290], [38, -326], [23, -345]];
  blob(g, torso, 3); g.fillStyle = INK[0]; g.globalAlpha = 0.97; g.fill();
  g.save(); g.clip(); const tg = g.createLinearGradient(-10, 0, 48, 0); tg.addColorStop(0, "rgba(239,230,210,0)"); tg.addColorStop(1, "rgba(239,230,210,0.17)"); g.fillStyle = tg; g.globalAlpha = 1; g.fillRect(-50, -360, 110, 140); g.restore();
  feibai(g, spline([[-26, -334], [-34, -296], [-30, -256]], 5), 15, 0.42, 24, sc);
  feibai(g, spline([[30, -322], [38, -290], [33, -258]], 5), 9, 0.32, 25, sc);
  g.fillStyle = PAPER; g.globalAlpha = 0.78; ribbon(g, spline([[15, -348], [27, -333], [23, -298], [30, -256]], 4), (s) => lerp(2.5, 0.8, s)); g.fill();   // the under-collar
  g.strokeStyle = PAPER; g.lineWidth = 1.2; g.lineCap = "round"; g.globalAlpha = 0.22; g.beginPath(); g.moveTo(-18, -338); g.quadraticCurveTo(-30, -296, -27, -256); g.stroke();
  rpoly(g, [[-39, -248, 3], [39, -248, 3], [40, -235, 3], [-40, -235, 3]], 3); g.fillStyle = VERM; g.globalAlpha = 0.95; g.fill();
  g.fillStyle = VERM_D; g.globalAlpha = 0.55; g.fillRect(-39, -239, 79, 2.2); g.globalAlpha = 0.3; g.fillRect(-39, -244.5, 79, 1.1);
  g.fillStyle = VERM; g.globalAlpha = 0.95; g.beginPath(); g.ellipse(-39, -243, 7, 9, 0.3, 0, TAU); g.fill();
  // the head
  g.save(); g.translate(12, -342); g.rotate(P.bow ?? 0);
  g.fillStyle = INK[0];
  for (const [len, amp, phs, w, a] of [[92, 11, 0.4, 6.5, 0.96], [70, 13, 2.2, 3, 0.8], [52, 9, 4, 2, 0.7]]) { g.globalAlpha = a; ribbon(g, strand(-13, -64, PI + 0.12, len, t, { amp: amp * whip, speed: 5.4, phase: phs, droop: 0.26 }), (s) => w * (1 - s * 0.92)); g.fill(); }
  const head = [[-8, 2], [-21, -18], [-24, -40], [-14, -60], [6, -68], [24, -62], [33, -50], [37, -43], [35.5, -38], [40, -32], [47.5, -25.5], [41.5, -22], [39.5, -19], [42.5, -16], [38.5, -13.5], [41.5, -10.5], [37.5, -7], [38.5, -1], [30, 4], [16, 1], [15, 10], [-6, 12]];
  g.globalAlpha = 0.97; blob(g, head, 1.5); g.fill();
  g.save(); g.clip(); const hg = g.createLinearGradient(14, 0, 48, 0); hg.addColorStop(0, "rgba(239,230,210,0)"); hg.addColorStop(1, "rgba(239,230,210,0.3)"); g.fillStyle = hg; g.globalAlpha = 1; g.fillRect(10, -52, 40, 60); g.restore();
  g.globalAlpha = 0.97; g.fillStyle = INK[0]; g.beginPath(); g.ellipse(-10, -66, 11.5, 8, -0.35, 0, TAU); g.fill();
  g.strokeStyle = PAPER; g.lineCap = "round"; g.globalAlpha = 0.5; g.lineWidth = 1.2; g.beginPath(); g.moveTo(27, -40.5); g.quadraticCurveTo(31, -41.8, 35, -40); g.stroke();   // the eye, a slit of paper
  g.globalAlpha = 0.26; g.lineWidth = 1; g.beginPath(); g.arc(6, -29, 6.5, -1.9, 1.2); g.stroke();
  g.beginPath(); g.moveTo(27, -57); g.quadraticCurveTo(13, -46, 9, -37); g.stroke();
  g.globalAlpha = 0.18; g.beginPath(); g.moveTo(10, -6); g.quadraticCurveTo(22, -1, 34, -3); g.stroke();
  g.restore();
  // the near arm, two bones, placed by where the hand has to be
  const S = [8, -322], L1 = 64, L2 = 64, dxh = hand[0] - S[0], dyh = hand[1] - S[1], d = Math.hypot(dxh, dyh) || 1, dd = clamp(d, 10, L1 + L2 - 1), base = Math.atan2(dyh, dxh);
  const ea = base + Math.acos(clamp((L1 * L1 + dd * dd - L2 * L2) / (2 * L1 * dd), -1, 1)) * (P.elbow ?? 1), E = [S[0] + Math.cos(ea) * L1, S[1] + Math.sin(ea) * L1], Wp = [S[0] + (dxh / d) * dd, S[1] + (dyh / d) * dd];
  const fxv = Wp[0] - E[0], fyv = Wp[1] - E[1], fl = Math.hypot(fxv, fyv) || 1, ux = fxv / fl, uy = fyv / fl, up = ux >= 0 ? 1 : -1, tx = uy * up, ty = -ux * up;   // (tx, ty): the upper side of the forearm
  const swy = (Math.sin(t * 4.1 + 1) * 5 + Math.sin(t * 7.3) * 2) * whip, drop = 18 + 30 * Math.abs(ux);
  if (sw.free) drawSword();
  g.fillStyle = INK[0]; g.globalAlpha = 0.97;
  ribbon(g, [[S[0] - 2, S[1] + 2], [(S[0] + E[0]) / 2, (S[1] + E[1]) / 2], E], (s) => lerp(15, 12, s)); g.fill();
  // the sleeve: a sail of cloth hanging from the forearm
  const mx = lerp(E[0], Wp[0], 0.5), my = lerp(E[1], Wp[1], 0.5), hang = [lerp(E[0], Wp[0], 0.62) - 8 - swy, lerp(E[1], Wp[1], 0.62) + drop + 12];
  blob(g, [[E[0] + tx * 13, E[1] + ty * 13], [mx + tx * 13, my + ty * 13], [Wp[0] + tx * 10, Wp[1] + ty * 10], [Wp[0] - tx * 10, Wp[1] - ty * 10], [Wp[0] - tx * 12 - 4 - swy * 0.5, Wp[1] - ty * 12 + drop * 0.5], hang, [E[0] - 12 - swy * 0.4, E[1] + drop * 0.55], [E[0] - tx * 9 - 8, E[1] - ty * 9 + 2]], 3);
  g.fill(); g.strokeStyle = PAPER; g.globalAlpha = 0.34; g.lineWidth = 1.3; g.stroke();
  g.globalAlpha = 0.24; g.beginPath(); g.moveTo(E[0] + 2, E[1] + 6); g.quadraticCurveTo(mx - 6, my + drop * 0.5, hang[0] + 4, hang[1] - 6); g.stroke();
  g.beginPath(); g.moveTo(mx + 6, my + 4); g.quadraticCurveTo(mx + 2, my + drop * 0.4, hang[0] + 12, hang[1] - 10); g.stroke();
  feibai(g, [[E[0] - 4, E[1] + drop * 0.2], [mx - 6, my + drop * 0.42], [hang[0] + 10, hang[1] - 12]], 11, 0.36, 26, sc);
  g.globalAlpha = 0.6; g.strokeStyle = PAPER; g.lineWidth = 1.6; g.beginPath(); g.moveTo(Wp[0] + tx * 9, Wp[1] + ty * 9); g.lineTo(Wp[0] - tx * 9, Wp[1] - ty * 9); g.stroke();    // the cuff
  g.globalAlpha = 1; g.fillStyle = INK[1]; g.beginPath(); g.ellipse(Wp[0] + ux * 6, Wp[1] + uy * 6, 9.5, 7.5, Math.atan2(uy, ux), 0, TAU); g.fill();
  g.strokeStyle = PAPER; g.globalAlpha = 0.34; g.lineWidth = 0.9; for (let i = -1; i <= 1; i++) { g.beginPath(); g.moveTo(Wp[0] + ux * (6 + i * 4) - uy * 5, Wp[1] + uy * (6 + i * 4) + ux * 5); g.lineTo(Wp[0] + ux * (6 + i * 4) + uy * 1, Wp[1] + uy * (6 + i * 4) - ux * 1); g.stroke(); }
  g.restore();
  g.restore();
  return { tip, grip };
}

/** The master in profile, seated, facing right: line and pale wash. Units: about 330 tall seated, base at y = 0. */
export function masterSide(g, x, y, sc, P) {
  const t = P.t, br = Math.sin(t * 1.25) * 1.3, w = P.wind ?? 1;
  g.save(); g.translate(x, y); g.scale(sc, sc);
  g.fillStyle = INK[5];     // hair down the back, behind the robe
  for (let i = 0; i < 5; i++) { g.globalAlpha = 0.75; ribbon(g, strand(-26 - i * 2, -300 + i * 5, PI * 0.5 + 0.35, 66 + i * 9, t, { amp: (5 + i) * w, speed: 3.6, phase: i * 1.3, droop: -0.1, freq: 0.9 }), (s) => 2.6 * (1 - s)); g.fill(); }
  const robe = [[-122, 0], [-132, -30], [-106, -72], [-86, -112], [-92, -152], [-84, -198 - br], [-60, -238 - br], [-28, -258 - br], [4, -258 - br], [26, -246 - br], [46, -212 - br], [54, -170], [72, -130], [112, -108], [160, -92], [186, -48], [178, 0], [50, 5], [-50, 5]], rp = spline(robe, 5, true);
  g.globalAlpha = 1; g.beginPath(); trace(g, rp, true); g.fillStyle = PAPER; g.fill(); g.fillStyle = INK[6]; g.globalAlpha = 0.5; g.fill();
  const lg = g.createLinearGradient(-140, 0, 110, 0); lg.addColorStop(0, "rgba(52,46,40,0.66)"); lg.addColorStop(0.45, "rgba(52,46,40,0.2)"); lg.addColorStop(1, "rgba(52,46,40,0)"); g.fillStyle = lg; g.globalAlpha = 1; g.fill();
  const bg = g.createLinearGradient(0, -90, 0, 0); bg.addColorStop(0, "rgba(52,46,40,0)"); bg.addColorStop(1, "rgba(52,46,40,0.42)"); g.fillStyle = bg; g.fill();
  contour(g, spline(robe.slice(0, 17), 5), 6.2, 2, INK[0], 0.88);
  for (const [pts, wd, a] of [
    [[[-70, -206], [-76, -150], [-66, -98], [-90, -40], [-96, -8]], 4, 0.75], [[[-50, -232], [-56, -160], [-44, -90], [-56, -18]], 3, 0.55], [[[-112, -40], [-56, -22], [10, -28]], 3.2, 0.55],
    [[[52, -200], [34, -152], [58, -108]], 3.6, 0.7], [[[116, -104], [146, -62], [142, -14]], 3.8, 0.7], [[[80, -62], [128, -40], [172, -46]], 3.2, 0.6], [[[-16, -38], [34, -50], [92, -32]], 2.8, 0.5],
  ]) contour(g, spline(pts, 5), wd, pts[0][0], INK[1], a);
  // the great sleeve over the knee: its hem is what moves
  const hs = Math.sin(t * 2.1) * 5 * w + Math.sin(t * 3.7 + 1) * 2 * w;
  const sl = [[-26, -230 - br], [30, -224 - br], [84, -152], [130, -118], [146, -98], [130, -60 + hs * 0.4], [86, -34 + hs], [36, -42 + hs * 0.7], [-8, -80], [-38, -150]], sp = spline(sl, 5, true);
  g.beginPath(); trace(g, sp, true); g.fillStyle = PAPER; g.globalAlpha = 1; g.fill(); g.fillStyle = INK[6]; g.globalAlpha = 0.4; g.fill();
  const sg = g.createLinearGradient(0, -200, 0, -30); sg.addColorStop(0, "rgba(52,46,40,0)"); sg.addColorStop(1, "rgba(52,46,40,0.44)"); g.fillStyle = sg; g.globalAlpha = 1; g.fill();
  contour(g, spline(sl.slice(1, 10), 5), 6.5, 5);
  contour(g, spline([[16, -206], [58, -132], [74, -50 + hs]], 5), 3.4, 1, INK[1], 0.7);
  contour(g, spline([[-10, -190], [24, -112], [42, -54 + hs * 0.7]], 5), 2.8, 4, INK[1], 0.55);
  g.fillStyle = PAPER; g.globalAlpha = 1; g.beginPath(); g.ellipse(147, -99, 13, 9, 0.5, 0, TAU); g.fill(); g.fillStyle = INK[5]; g.globalAlpha = 0.55; g.fill(); contour(g, spline([[136, -104], [148, -109], [160, -98], [151, -89], [138, -92]], 3), 2.8, 0);
  contour(g, spline([[-36, -248 - br], [-8, -241 - br], [22, -234 - br], [46, -196]], 4), 11, 7, INK[1], 0.92);     // the collar
  // the head
  g.save(); g.translate(2, -256 - br); g.rotate(P.nod ?? 0.03); g.scale(1.2, 1.2);
  const head = [[-14, -2], [-30, -30], [-22, -56], [2, -68], [26, -60], [36, -46], [34, -40], [46, -28], [36, -25], [37, -19], [30, -8], [16, -2], [10, 8], [-8, 8]], hp = spline(head, 2, true);
  g.beginPath(); trace(g, hp, true); g.fillStyle = PAPER; g.globalAlpha = 1; g.fill(); g.fillStyle = INK[6]; g.globalAlpha = 0.36; g.fill();
  const hg = g.createLinearGradient(-30, 0, 30, 0); hg.addColorStop(0, "rgba(52,46,40,0.5)"); hg.addColorStop(0.7, "rgba(52,46,40,0)"); g.fillStyle = hg; g.globalAlpha = 1; g.fill();
  contour(g, hp, 3.6, 3);
  g.fillStyle = INK[4]; g.globalAlpha = 0.9; g.beginPath(); g.ellipse(-14, -69, 12, 9.5, -0.3, 0, TAU); g.fill(); contour(g, spline([[-27, -68], [-16, -80], [-3, -72], [-12, -60], [-26, -66]], 3), 2.6, 2);
  g.strokeStyle = INK[0]; g.lineWidth = 2.2; g.lineCap = "round"; g.globalAlpha = 0.9; g.beginPath(); g.moveTo(-32, -74); g.lineTo(6, -66); g.stroke();
  g.lineWidth = 1.8; g.beginPath(); g.moveTo(21, -39); g.quadraticCurveTo(26, -35.5, 31, -38.5); g.stroke();                 // the eye: shut
  g.lineWidth = 1.5; g.globalAlpha = 0.7; g.beginPath(); g.arc(1, -34, 7, -2, 1.3); g.stroke();
  g.fillStyle = INK[4];
  for (let i = 0; i < 3; i++) { g.globalAlpha = 0.85; ribbon(g, strand(22 + i * 3, -47, 0.5 + i * 0.16, 20 + i * 4, t, { amp: 1.5 * w, speed: 3, phase: i, droop: 0.5, n: 6 }), (s) => 1.9 * (1 - s)); g.fill(); }   // the long brow
  for (let i = 0; i < 11; i++) {      // moustache and beard: pale, long, the one thing on him that the wind moves
    const fromChin = i > 2, rx = fromChin ? 18 + (i - 3) * 2.2 : 34, ry = fromChin ? -6 + (i % 2) * 2 : -21, len = fromChin ? 74 + (i * 13) % 36 : 44 + i * 6;
    g.fillStyle = i % 3 === 0 ? INK[4] : i % 3 === 1 ? INK[6] : PAPER; g.globalAlpha = 0.92;
    ribbon(g, strand(rx, ry, PI * 0.5 + 0.12 + (fromChin ? 0.05 * (i - 6) : -0.2), len, t, { amp: (5 + (i % 4) * 1.6) * w, speed: 3.4, phase: i * 0.9, droop: -0.16, freq: 0.85, n: 10 }), (s) => (fromChin ? 3.2 : 2.2) * (1 - s * 0.95)); g.fill();
  }
  g.restore(); g.restore();
}

/**
 * Seen from behind, seated. `dark` paints the swordsman (ink, sash, tail of hair); otherwise the master
 * (pale robe, line). `shade` paints the master as a small dark shape against the sun. Units: about 320 tall.
 */
export function seatedBack(g, x, y, sc, P) {
  const t = P.t, br = Math.sin(t * 1.25 + (P.dark ? 1.7 : 0)) * 1.3, w = P.wind ?? 1, rise = P.rise ?? 0;
  g.save(); g.translate(x, y); g.scale(sc, sc * (1 + rise * 0.16));
  if (P.dark) {
    g.fillStyle = VERM;
    for (const [len, amp, phs, wd] of [[112, 12, 0.3, 6], [80, 10, 2.4, 5]]) { g.globalAlpha = 0.93; sashTail(g, strand(-8, -108, PI - 0.12, len, t, { amp: amp * w, speed: 5.6, phase: phs, droop: 0.24, freq: 1.2 }), wd); }
    // hakama, folded under him
    blob(g, [[-76, -108], [-112, -74], [-132, -30], [-124, 0], [-50, 7], [50, 7], [124, 0], [132, -30], [112, -74], [76, -108]], 5);
    g.globalAlpha = 0.95; g.fillStyle = INK[3]; g.fill();
    const lg = g.createLinearGradient(-140, 0, 140, 0); lg.addColorStop(0, "rgba(15,13,11,0.62)"); lg.addColorStop(0.75, "rgba(15,13,11,0.06)"); g.fillStyle = lg; g.globalAlpha = 1; g.fill();
    const bg = g.createLinearGradient(0, -60, 0, 6); bg.addColorStop(0, "rgba(15,13,11,0)"); bg.addColorStop(1, "rgba(15,13,11,0.5)"); g.fillStyle = bg; g.fill();
    for (const [a, b] of [[[-56, -102], [-98, -6]], [[-30, -102], [-52, -2]], [[0, -102], [-2, 2]], [[30, -102], [50, -2]], [[56, -102], [96, -6]]]) contour(g, spline([a, [(a[0] + b[0]) / 2 + (a[0] < 0 ? -6 : 6), (a[1] + b[1]) / 2], b], 6), 4.4, a[0], INK[0], 0.85);
    feibai(g, spline([[40, -96], [70, -50], [104, -10]], 6), 14, 0.42, 31, sc);
    feibai(g, spline([[-16, -96], [-24, -50], [-30, -6]], 6), 10, 0.3, 32, sc);
    // the back: shoulders, the sleeves standing out at the elbows
    const back = [[-70, -104], [-94, -122], [-100, -160], [-92, -200 - br], [-80, -226 - br], [-54, -242 - br], [-26, -251 - br], [-12, -256 - br], [12, -256 - br], [26, -251 - br], [54, -242 - br], [80, -226 - br], [92, -200 - br], [100, -160], [94, -122], [70, -104], [30, -98], [-30, -98]];
    blob(g, back, 4); g.fillStyle = INK[0]; g.globalAlpha = 0.97; g.fill();
    feibai(g, spline([[52, -232], [82, -190], [92, -140]], 5), 15, 0.4, 33, sc);
    feibai(g, spline([[-30, -240], [-44, -190], [-40, -130]], 5), 11, 0.26, 34, sc);
    g.strokeStyle = PAPER; g.lineWidth = 1.4; g.lineCap = "round";
    g.globalAlpha = 0.28; g.beginPath(); g.moveTo(0, -250); g.quadraticCurveTo(3, -180, 0, -124); g.stroke();
    g.globalAlpha = 0.26; for (const sx of [-1, 1]) { g.beginPath(); g.moveTo(sx * 60, -226); g.quadraticCurveTo(sx * 70, -176, sx * 74, -122); g.stroke(); }
    g.globalAlpha = 0.34; g.lineWidth = 1.6; g.beginPath(); trace(g, spline([[-97, -150], [-90, -200 - br], [-78, -225 - br], [-52, -241 - br], [-18, -253 - br]], 4).map((p) => [p[0] + 2.5, p[1] + 2.5])); g.stroke();   // the sun, beyond him, catches the edge
    g.beginPath(); trace(g, spline([[97, -150], [90, -200 - br], [78, -225 - br], [52, -241 - br], [18, -253 - br]], 4).map((p) => [p[0] - 2.5, p[1] + 2.5])); g.stroke();
    g.fillStyle = VERM; g.globalAlpha = 0.95; ribbon(g, spline([[-78, -106], [-40, -112], [0, -114], [40, -112], [78, -106]], 6), () => 7); g.fill();
    g.fillStyle = VERM_D; g.globalAlpha = 0.5; ribbon(g, spline([[-78, -101], [0, -109], [78, -101]], 6), () => 1.3); g.fill();
    g.fillStyle = VERM; g.globalAlpha = 0.96; g.beginPath(); g.ellipse(-4, -111, 13, 9, 0.2, 0, TAU); g.fill(); g.fillStyle = VERM_D; g.globalAlpha = 0.45; g.beginPath(); g.ellipse(-4, -110, 4, 7, 0.2, 0, TAU); g.fill();
    g.save(); g.translate(0, -257 - br); g.rotate(P.nod ?? 0);
    g.fillStyle = INK[0];
    for (const [len, amp, phs, wd, a] of [[96, 11, 0.8, 6.5, 0.96], [74, 12, 2.6, 3, 0.8], [56, 9, 4.4, 2, 0.7]]) { g.globalAlpha = a; ribbon(g, strand(-4, -68, PI + 0.14, len, t, { amp: amp * w, speed: 5.2, phase: phs, droop: 0.26 }), (s) => wd * (1 - s * 0.92)); g.fill(); }
    g.globalAlpha = 0.97; blob(g, [[-11, 6], [-10, -8], [-21, -16], [-24, -36], [-16, -56], [0, -62], [16, -56], [24, -36], [21, -16], [10, -8], [11, 6]], 2); g.fill(); g.beginPath(); g.ellipse(0, -66, 9.5, 8, 0, 0, TAU); g.fill();
    g.fillStyle = INK[2]; for (const sx of [-1, 1]) { g.beginPath(); g.ellipse(sx * 24, -32, 4, 7.5, sx * 0.1, 0, TAU); g.fill(); }
    g.strokeStyle = PAPER; g.globalAlpha = 0.3; g.lineWidth = 1.4; g.beginPath(); g.arc(0, -34, 23, PI * 1.12, PI * 1.88); g.stroke();
    g.restore();
  } else {
    const robe = [[-128, 0], [-146, -34], [-124, -114], [-96, -186 - br], [-58, -232 - br], [-20, -248 - br], [20, -248 - br], [58, -232 - br], [96, -186 - br], [124, -114], [146, -34], [128, 0], [50, 6], [-50, 6]], rp = spline(robe, 5, true);
    g.beginPath(); trace(g, rp, true); g.fillStyle = PAPER; g.globalAlpha = 1; g.fill(); g.fillStyle = INK[P.shade ? 2 : 6]; g.globalAlpha = P.shade ? 0.92 : 0.5; g.fill();
    const lg = g.createLinearGradient(-150, 0, 150, 0); lg.addColorStop(0, "rgba(52,46,40,0.6)"); lg.addColorStop(0.5, "rgba(52,46,40,0.14)"); lg.addColorStop(1, "rgba(52,46,40,0.02)"); g.fillStyle = lg; g.globalAlpha = 1; g.fill();
    const bg = g.createLinearGradient(0, -100, 0, 0); bg.addColorStop(0, "rgba(52,46,40,0)"); bg.addColorStop(1, "rgba(52,46,40,0.44)"); g.fillStyle = bg; g.fill();
    contour(g, spline(robe.slice(0, 12), 5), 7, 2);
    for (const [pts, wd, a] of [
      [[[0, -242], [5, -160], [-3, -80], [2, -8]], 3.6, 0.75], [[[-66, -224], [-100, -150], [-112, -78], [-96, -26]], 4.4, 0.8], [[[66, -224], [100, -150], [112, -78], [96, -26]], 3.8, 0.7],
      [[[-84, -144], [-50, -92], [-60, -28]], 3.2, 0.6], [[[84, -144], [50, -92], [60, -28]], 3, 0.55], [[[-128, -30], [-70, -18], [-16, -26]], 3.2, 0.55], [[[128, -30], [70, -18], [16, -26]], 3, 0.5],
    ]) contour(g, spline(pts, 5), wd, pts[0][0], INK[1], a);
    contour(g, spline([[-30, -250 - br], [-16, -228 - br], [0, -222 - br], [16, -228 - br], [30, -250 - br]], 3), 10, 7, INK[1], 0.92);
    g.save(); g.translate(0, -248 - br); g.rotate(P.nod ?? 0); g.scale(1.16, 1.16);
    for (let i = 0; i < 7; i++) { g.fillStyle = i % 3 === 0 ? INK[4] : i % 3 === 1 ? INK[6] : PAPER; g.globalAlpha = 0.9; ribbon(g, strand(-16 - i, -6 + i * 2, PI - 0.35 + i * 0.07, 60 + (i * 17) % 30, t, { amp: (5 + i) * w, speed: 3.5, phase: i * 1.1, droop: 0.3, freq: 0.9, n: 10 }), (s) => 2.8 * (1 - s * 0.95)); g.fill(); }   // the beard, blown past his shoulder
    const hp = spline([[-9, 6], [-22, -8], [-26, -30], [-18, -52], [0, -60], [18, -52], [26, -30], [22, -8], [9, 6]], 2, true);
    g.beginPath(); trace(g, hp, true); g.fillStyle = PAPER; g.globalAlpha = 1; g.fill(); g.fillStyle = INK[P.shade ? 2 : 6]; g.globalAlpha = P.shade ? 0.92 : 0.4; g.fill();
    const hg = g.createLinearGradient(-26, 0, 26, 0); hg.addColorStop(0, "rgba(52,46,40,0.5)"); hg.addColorStop(0.7, "rgba(52,46,40,0)"); g.fillStyle = hg; g.globalAlpha = 1; g.fill();
    contour(g, hp, 3.4, 3);
    for (const sx of [-1, 1]) contour(g, spline([[sx * 25, -36], [sx * 31, -30], [sx * 26, -20]], 2), 2.4, sx);
    g.fillStyle = INK[4]; g.globalAlpha = 0.92; g.beginPath(); g.ellipse(0, -64, 12, 10, 0, 0, TAU); g.fill(); contour(g, spline([[-12, -62], [-6, -74], [8, -73], [12, -62]], 2), 2.4, 1);
    g.strokeStyle = INK[0]; g.lineWidth = 2.2; g.lineCap = "round"; g.globalAlpha = 0.9; g.beginPath(); g.moveTo(-21, -68); g.lineTo(21, -62); g.stroke();
    g.fillStyle = INK[4]; for (const sx of [-1, 1]) for (let i = 0; i < 3; i++) { g.globalAlpha = 0.7; ribbon(g, strand(sx * (20 - i * 3), -12 + i * 2, PI * 0.5 + sx * 0.25, 20 + i * 5, t, { amp: 1.5, speed: 3, phase: i + sx, droop: 0, n: 5 }), (s) => 1.5 * (1 - s)); g.fill(); }
    g.restore();
  }
  g.restore();
}

/** The swordsman from behind, climbing. Units: 410 tall. */
export function swordsmanBack(g, x, y, sc, P) {
  const t = P.t, ph = P.walk;
  g.save(); g.translate(x, y); g.scale(sc, sc); g.translate(Math.sin(ph) * 5, -Math.abs(Math.sin(ph)) * 6);
  const lL = Math.max(0, Math.sin(ph)) * 30, lR = Math.max(0, -Math.sin(ph)) * 30, swg = Math.sin(ph) * 9;
  g.fillStyle = VERM;
  for (const [len, amp, phs, wd] of [[108, 12, 0.3, 5.6], [80, 10, 2.4, 4.6]]) { g.globalAlpha = 0.93; sashTail(g, strand(-6, -240, PI - 0.1, len, t, { amp, speed: 5.8, phase: phs, droop: 0.24, freq: 1.2 }), wd); }
  g.fillStyle = INK[0]; g.globalAlpha = 0.97; ribbon(g, spline([[-30, -236], [-70, -206], [-112, -168]], 6), (s) => lerp(5.6, 4.2, s)); g.fill();
  g.lineCap = "round"; g.strokeStyle = INK[0]; g.lineWidth = 7; g.beginPath(); g.moveTo(-40, -238); g.lineTo(-58, -252); g.stroke();
  for (const [sx, l] of [[-1, lL], [1, lR]]) {
    rpoly(g, [[sx * 2, -238, 2], [sx * 42, -238, 3], [sx * 56, -12 - l, 6], [sx * 4, -8 - l, 4]], 4); g.fillStyle = INK[3]; g.globalAlpha = 0.95; g.fill();
    const lg = g.createLinearGradient(-56, 0, 56, 0); lg.addColorStop(0, "rgba(15,13,11,0.6)"); lg.addColorStop(0.8, "rgba(15,13,11,0.06)"); g.fillStyle = lg; g.globalAlpha = 1; g.fill();
    contour(g, spline([[sx * 16, -236], [sx * 22, -120], [sx * 22, -12 - l]], 8), 4.4, sx, INK[0], 0.85);
    contour(g, spline([[sx * 30, -236], [sx * 40, -120], [sx * 42, -12 - l]], 8), 3.4, sx + 2, INK[0], 0.75);
    feibai(g, spline([[sx * 36, -226], [sx * 46, -120], [sx * 50, -20 - l]], 6), 9, 0.4, 41 + sx, sc);
    g.fillStyle = INK[0]; g.globalAlpha = 0.97; rpoly(g, [[sx * 10, -10 - l], [sx * 40, -10 - l], [sx * 40, 1 - l], [sx * 10, 1 - l]], 3); g.fill();
  }
  g.fillStyle = INK[0]; g.globalAlpha = 0.97;
  for (const sx of [-1, 1]) { const s2 = swg * sx; rpoly(g, [[sx * 40, -336, 10], [sx * 66, -306, 12], [sx * 74 + s2 * 0.4, -222 + Math.abs(s2) * 0.3, 8], [sx * 52 + s2 * 0.5, -208, 8], [sx * 36, -256, 6]], 6); g.fill(); }
  blob(g, [[-41, -236], [-48, -290], [-45, -330], [-22, -346], [0, -349], [22, -346], [45, -330], [48, -290], [41, -236]], 4); g.fill();
  feibai(g, spline([[28, -334], [42, -296], [38, -256]], 5), 13, 0.4, 44, sc);
  feibai(g, spline([[-14, -338], [-22, -296], [-18, -258]], 5), 9, 0.26, 45, sc);
  g.strokeStyle = PAPER; g.lineWidth = 1.5; g.globalAlpha = 0.25; g.beginPath(); g.moveTo(0, -344); g.quadraticCurveTo(3, -300, 0, -256); g.stroke();
  for (const sx of [-1, 1]) { g.beginPath(); g.moveTo(sx * 42, -330); g.quadraticCurveTo(sx * 46, -290, sx * 40, -256); g.stroke(); }
  rpoly(g, [[-42, -253, 3], [42, -253, 3], [43, -237, 3], [-43, -237, 3]], 3); g.fillStyle = VERM; g.globalAlpha = 0.95; g.fill();
  g.beginPath(); g.ellipse(-3, -245, 12, 9, 0.2, 0, TAU); g.fill(); g.fillStyle = VERM_D; g.globalAlpha = 0.45; g.beginPath(); g.ellipse(-3, -244, 4, 7, 0.2, 0, TAU); g.fill();
  g.fillStyle = INK[0];
  for (const [len, amp, phs, wd, a] of [[92, 11, 0.8, 6.5, 0.96], [70, 12, 2.6, 3, 0.8]]) { g.globalAlpha = a; ribbon(g, strand(-4, -412, PI + 0.14, len, t, { amp, speed: 5.2, phase: phs, droop: 0.26 }), (s) => wd * (1 - s * 0.92)); g.fill(); }
  g.globalAlpha = 0.97; blob(g, [[-10, -340], [-9, -354], [-21, -362], [-24, -382], [-16, -402], [0, -408], [16, -402], [24, -382], [21, -362], [9, -354], [10, -340]], 2); g.fill(); g.beginPath(); g.ellipse(0, -411, 9, 8, 0, 0, TAU); g.fill();
  g.fillStyle = INK[2]; for (const sx of [-1, 1]) { g.beginPath(); g.ellipse(sx * 24, -378, 4, 7.5, 0, 0, TAU); g.fill(); }
  g.restore();
}
