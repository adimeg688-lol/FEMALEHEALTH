/**
 * FRH · EPISODE 01 · WHERE DID I GO?   45 s, 1080 × 1920, 30 fps.
 *
 * The five supplied paintings (img/) are never redrawn or recoloured. Each one moves as a living
 * oil painting: a slow eased push-in, a gentle low-frequency "breathing" of the paint, and in
 * places a local motion the brief asks for (drapery and hair flow, fog, light travelling along
 * the ribbons, the scale pans swaying without tipping). On top, drawn in code: drifting shards,
 * memory fragments and petals, gold threads, glowing particles, paper fragments, warm light, the
 * title, the HRT type, captions on the spoken word, the end card, grain and a vignette.
 *
 * Contract: window.film = { duration, fps, width, height, shots, ready, seek(t) }. seek(t) is a
 * pure function of t: every moving thing is a formula of t, seeded at bake time.
 */
const W = 1080, H = 1920, FPS = 30, DURATION = 45;

// ── Tools ───────────────────────────────────────────────────────────────────
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
const fract = (x) => x - Math.floor(x);
function plate(w, h, draw) { const c = new OffscreenCanvas(w, h); draw(c.getContext("2d"), w, h); return c; }

// ── The timeline (from audio/words.json: the voice starts at 0.4 s) ─────────
const CUTS = [4.05, 10.2, 23.05, 34.5];
const END_CARD = 42.2;
const SHOTS = [
  { id: "s01-mirror", start: 0, end: 4.05, also: [0, 2.95, 3.95], img: 0 },
  { id: "s02-memories", start: 4.05, end: 10.2, also: [4.2, 7.5, 10.0], img: 1 },
  { id: "s03-ribbons", start: 10.2, end: 23.05, also: [10.4, 15.6, 19.5, 22.9], img: 2 },
  { id: "s04-balance", start: 23.05, end: 34.5, also: [23.2, 27.6, 31.6, 34.3], img: 3 },
  { id: "s05-hope", start: 34.5, end: END_CARD, also: [34.7, 38.2, 41.0], img: 4 },
  { id: "s06-endcard", start: END_CARD, end: DURATION, also: [42.6, 44.95], img: 4 },
];
const XF = 0.28;   // half the dissolve at each cut (0.56 s, 17 frames)
// How each painting moves. focal: where the push-in heads (image fractions). zoom: from → to.
// regions: local motion in the shader. mode 0 flow, 1 vertical sway, 2 tilt (a beam about its centre).
const LOOKS = [
  { file: "img/01_Fractured_Mirror.png", focal: [0.66, 0.24], zoom: [1.025, 1.075], s: 0, e: 4.05 + XF,
    breathe: 2.2, glow: 0.10, fog: 0.0,
    regions: [[0.2, 0.75, 0.32, 4.0, 0, 0.9, 0.0, 0.4], [0.12, 0.2, 0.12, 2.2, 0, 0.7, 1.0, -1.2], [0.7, 0.45, 0.28, 2.0, 0, 0.6, 2.0, 0.3]] },
  { file: "img/02_Disappearing_Memories.png", focal: [0.6, 0.3], zoom: [1.025, 1.07], s: 4.05 - XF, e: 10.2 + XF,
    breathe: 2.2, glow: 0.10, fog: 0.16,
    regions: [[0.7, 0.18, 0.2, 4.0, 0, 0.8, 0.0, 2.7], [0.5, 0.7, 0.35, 3.5, 0, 0.7, 1.5, 0.2], [0.82, 0.6, 0.12, 3.0, 1, 0.55, 0.5, 0]] },
  { file: "img/03_Hormone_Ribbons.png", focal: [0.5, 0.45], zoom: [1.025, 1.085], s: 10.2 - XF, e: 23.05 + XF,
    breathe: 2.4, glow: 0.42, fog: 0.0,
    regions: [[0.15, 0.25, 0.25, 4.5, 0, 0.6, 0.0, 2.4], [0.85, 0.4, 0.25, 4.0, 0, 0.55, 1.0, -0.8], [0.3, 0.85, 0.3, 4.0, 0, 0.6, 2.0, 0.6]] },
  { file: "img/04_Benefits_and_Risks.png", focal: [0.5, 0.42], zoom: [1.025, 1.07], s: 23.05 - XF, e: 34.5 + XF,
    breathe: 2.0, glow: 0.12, fog: 0.0,
    // the beam tilts a few pixels about the pivot and the pans rise and fall against each other: never tipping
    regions: [[0.5, 0.48, 0.24, 3.2, 2, 0.5, 0.0, 0], [0.32, 0.61, 0.1, 5.0, 1, 0.5, 0.0, 0], [0.66, 0.61, 0.1, -5.0, 1, 0.5, 0.0, 0], [0.5, 0.18, 0.2, 3.0, 0, 0.7, 1.0, 2.9]] },
  { file: "img/05_Hope.png", focal: [0.55, 0.3], zoom: [1.025, 1.08], s: 34.5 - XF, e: DURATION,
    breathe: 2.4, glow: 0.32, fog: 0.0,
    regions: [[0.5, 0.15, 0.2, 4.0, 0, 0.6, 0.0, 0.3], [0.25, 0.8, 0.3, 4.5, 0, 0.55, 1.0, -0.5], [0.8, 0.45, 0.25, 3.5, 0, 0.6, 2.0, 2.0]] },
];

const canvas = document.getElementById("c");
const ctx = canvas.getContext("2d");
let CAPTIONS = [];
let IMGS = [], GL = null, SPR = {}, GRAIN, VIGNETTE, BACKING;
let SHARDS = [], PETALS2 = [], FRAGS = [], THREADS = [], MOTES = [], SPARKS = [], PAPERS = [], PETALS5 = [];

// ── WebGL: the living paintings ─────────────────────────────────────────────
const VS = `attribute vec2 p; varying vec2 uv; void main(){ uv = vec2(p.x*0.5+0.5, 0.5-p.y*0.5); gl_Position = vec4(p,0.,1.); }`;
const FS = `precision highp float;
varying vec2 uv;
uniform sampler2D img; uniform float t, zoom, alpha, breathe, glow, fog, aspect;
uniform vec2 focal;
uniform vec4 rA[4]; uniform vec4 rB[4]; uniform int nr;
float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float n2(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
  return mix(mix(h(i),h(i+vec2(1,0)),f.x), mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x), f.y); }
float fbm(vec2 p){ float s=0., a=.5; for(int i=0;i<3;i++){ s+=a*n2(p); p=p*2.03+vec2(1.7,9.2); a*=.5; } return s; }
void main(){
  // the push-in: sample nearer the focal point as zoom grows
  vec2 q = focal + (uv - focal) / zoom;
  vec2 px = vec2(1.0/1080.0, 1.0/1920.0);
  // the paint breathes: a slow, low-frequency displacement of a couple of pixels
  vec2 w = vec2(fbm(q*2.6 + vec2(t*0.045, 0.0)) - 0.5, fbm(q*2.6 + vec2(4.1, t*0.04)) - 0.5);
  vec2 d = w * breathe * 2.0 * px;
  for (int i = 0; i < 4; i++) {
    if (i >= nr) break;
    vec4 a = rA[i]; vec4 b = rB[i];           // a: centre.xy, radius, amp(px) · b: mode, freq(Hz), phase, angle
    vec2 dv = (q - a.xy) * vec2(aspect, 1.0);
    float m = exp(-dot(dv, dv) / (a.z*a.z));
    float ph = 6.2831853 * b.y * t + b.z;
    if (b.x < 0.5) {                           // flow: cloth and hair ripple along a direction
      vec2 dir = vec2(cos(b.w), sin(b.w));
      float wave = sin(ph + dot(q, dir) * 18.0) * 0.6 + (fbm(q*5.0 + dir*t*0.25) - 0.5) * 1.6;
      d += dir * wave * a.w * m * px;
    } else if (b.x < 1.5) {                    // sway: the pan rises and falls
      d.y += sin(ph * 0.5) * a.w * m * px.y;
    } else {                                   // tilt: offset grows with distance from the pivot
      d.y += sin(ph * 0.5) * a.w * ((q.x - a.x) / a.z) * m * px.y;
    }
  }
  vec2 s = q + d;
  vec3 c = texture2D(img, s).rgb;
  // light travelling along the bright ribbons: a slow wave over the painting's own highlights
  float lum = dot(c, vec3(0.299, 0.587, 0.114));
  float hi = smoothstep(0.55, 0.92, lum);
  float trav = 0.5 + 0.5 * sin(6.2831853 * (s.y * 2.2 - t * 0.22) + fbm(s*3.0)*4.0);
  c += glow * hi * trav * vec3(1.0, 0.78, 0.5) * 0.35;
  // fog drifting across
  float f = fbm(s * vec2(2.2, 3.4) + vec2(-t * 0.06, t * 0.015));
  c = mix(c, vec3(0.80, 0.70, 0.72), fog * smoothstep(0.42, 0.78, f));
  gl_FragColor = vec4(c * alpha, alpha);
}`;

function initGL() {
  const cv = new OffscreenCanvas(W, H);
  const gl = cv.getContext("webgl", { preserveDrawingBuffer: true, premultipliedAlpha: true, antialias: false });
  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
  const prog = gl.createProgram();
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
  gl.useProgram(prog);
  const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, "p"); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const U = {}; for (const n of ["img", "t", "zoom", "alpha", "breathe", "glow", "fog", "aspect", "focal", "rA", "rB", "nr"]) U[n] = gl.getUniformLocation(prog, n);
  gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  const tex = IMGS.map((im) => {
    const tx = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tx);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, im);
    return tx;
  });
  return { cv, gl, U, tex };
}

/** How much of painting i is on screen at t (1 inside its shot, a dissolve at each cut). */
function weight(i, t) {
  const L = LOOKS[i];
  const inn = i === 0 ? 1 : smooth((t - L.s) / (2 * XF));
  const out = i === LOOKS.length - 1 ? 1 : 1 - smooth((t - (L.e - 2 * XF)) / (2 * XF));
  return Math.min(inn, out);
}
function zoomAt(i, t) { const L = LOOKS[i]; return lerp(L.zoom[0], L.zoom[1], smooth((t - L.s) / (L.e - L.s))); }

function drawPaintings(t) {
  const { gl, U, tex } = GL;
  gl.viewport(0, 0, W, H); gl.clearColor(0, 0, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT);
  let first = true;
  for (let i = 0; i < LOOKS.length; i++) {
    const w = weight(i, t);
    if (w <= 0.001) continue;
    const L = LOOKS[i];
    gl.bindTexture(gl.TEXTURE_2D, tex[i]); gl.uniform1i(U.img, 0);
    gl.uniform1f(U.t, t); gl.uniform1f(U.zoom, zoomAt(i, t)); gl.uniform1f(U.alpha, first ? 1 : w);
    gl.uniform1f(U.breathe, L.breathe); gl.uniform1f(U.glow, L.glow * (i === 4 ? lerp(0.6, 1.3, smooth((t - 34.5) / 7)) : 1)); gl.uniform1f(U.fog, L.fog);
    gl.uniform1f(U.aspect, W / H); gl.uniform2f(U.focal, L.focal[0], L.focal[1]);
    const A = new Float32Array(16), B = new Float32Array(16);
    L.regions.forEach((r, k) => { A.set(r.slice(0, 4), k * 4); B.set(r.slice(4, 8), k * 4); });
    gl.uniform4fv(U.rA, A); gl.uniform4fv(U.rB, B); gl.uniform1i(U.nr, L.regions.length);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    first = false;
  }
  ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 1;
  ctx.drawImage(GL.cv, 0, 0);
}
/** Image fraction → screen pixels, through painting i's push-in (so overlays ride with the camera). */
function toScreen(i, t, x, y) {
  const L = LOOKS[i], z = zoomAt(i, t);
  return [(L.focal[0] + (x - L.focal[0]) * z) * W, (L.focal[1] + (y - L.focal[1]) * z) * H];
}

// ── Sprites, baked once ─────────────────────────────────────────────────────
function shardSprite(r, size) {
  return plate(size, size, (c, w, h) => {
    const n = 4 + Math.floor(r() * 3), pts = [];
    for (let k = 0; k < n; k++) { const a = (k / n) * 6.283 + (r() - 0.5) * 0.9, rad = (0.28 + r() * 0.2) * w; pts.push([w / 2 + Math.cos(a) * rad * (k % 2 ? 0.55 : 1), h / 2 + Math.sin(a) * rad]); }
    c.beginPath(); pts.forEach(([x, y], k) => (k ? c.lineTo(x, y) : c.moveTo(x, y))); c.closePath();
    const g = c.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, "rgba(243,233,219,0.95)"); g.addColorStop(0.45, "rgba(196,160,178,0.85)"); g.addColorStop(1, "rgba(110,78,104,0.8)");
    c.fillStyle = g; c.fill();
    c.save(); c.clip(); c.globalAlpha = 0.35; c.fillStyle = "#fff";
    c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); c.lineTo(pts[1][0], pts[1][1]); c.lineTo(w / 2, h / 2); c.fill(); c.restore();
    c.strokeStyle = "rgba(217,183,141,0.9)"; c.lineWidth = Math.max(1, w * 0.018);
    c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); c.lineTo(pts[1][0], pts[1][1]); c.lineTo(pts[2][0], pts[2][1]); c.stroke();
  });
}
function petalSprite(r, size, palette) {
  return plate(size, size, (c, w, h) => {
    const col = palette[Math.floor(r() * palette.length)];
    c.translate(w / 2, h / 2); c.rotate(r() * 6.28);
    const L = w * 0.42, Wd = w * (0.16 + r() * 0.1);
    c.beginPath(); c.moveTo(-L, 0); c.bezierCurveTo(-L * 0.4, -Wd * 1.6, L * 0.5, -Wd * 1.2, L, 0); c.bezierCurveTo(L * 0.4, Wd * 1.3, -L * 0.5, Wd * 1.1, -L, 0);
    const g = c.createLinearGradient(-L, -Wd, L, Wd); g.addColorStop(0, col[0]); g.addColorStop(1, col[1]);
    c.fillStyle = g; c.fill();
    c.globalAlpha = 0.35; c.strokeStyle = col[2]; c.lineWidth = 1.2; c.beginPath(); c.moveTo(-L * 0.8, 0); c.quadraticCurveTo(0, -Wd * 0.3, L * 0.8, 0); c.stroke();
  });
}
function fragSprite(r) {   // a faded memory, like an old photograph with nothing legible in it
  return plate(150, 120, (c, w, h) => {
    c.translate(w / 2, h / 2); c.rotate((r() - 0.5) * 0.5);
    const fw = 96 + r() * 30, fh = 70 + r() * 20;
    c.fillStyle = "rgba(226,206,184,0.92)"; c.fillRect(-fw / 2, -fh / 2, fw, fh);
    const g = c.createRadialGradient(0, 0, 4, 0, 0, fw * 0.6); g.addColorStop(0, "rgba(176,140,112,0.9)"); g.addColorStop(1, "rgba(98,70,62,0.9)");
    c.fillStyle = g; c.fillRect(-fw / 2 + 6, -fh / 2 + 6, fw - 12, fh - 12);
    c.globalAlpha = 0.5; c.fillStyle = "rgba(60,40,40,1)";
    c.beginPath(); c.ellipse(-fw * 0.12, fh * 0.05, fw * 0.07, fh * 0.24, 0, 0, 6.28); c.ellipse(fw * 0.12, fh * 0.08, fw * 0.06, fh * 0.21, 0, 0, 6.28); c.fill();
  });
}
function paperSprite(r) {  // torn paper; the "print" is unreadable texture, never words
  return plate(170, 170, (c, w, h) => {
    c.translate(w / 2, h / 2); c.rotate(r() * 6.28);
    const n = 22, pts = [], ar = 0.45 + r() * 0.5;
    for (let k = 0; k < n; k++) { const a = (k / n) * 6.283, rad = (0.22 + r() * 0.06 + (k % 5 === 0 ? 0.08 * r() : 0)) * w; pts.push([Math.cos(a) * rad, Math.sin(a) * rad * ar]); }
    c.beginPath(); pts.forEach(([x, y], k) => (k ? c.lineTo(x, y) : c.moveTo(x, y))); c.closePath();
    const g = c.createLinearGradient(-60, -40, 60, 40); g.addColorStop(0, "rgba(240,228,208,0.92)"); g.addColorStop(1, "rgba(206,186,164,0.9)");
    c.fillStyle = g; c.fill();
    c.save(); c.clip(); c.filter = "blur(0.8px)";
    c.globalAlpha = 0.3; c.fillStyle = "#3d3438";
    for (let y = -80; y < 80; y += 7) for (let x = -80; x < 80; x += 5 + r() * 9) if (r() > 0.3) c.fillRect(x, y, 2 + r() * 6, 1.6);
    c.restore();
    c.strokeStyle = "rgba(150,126,108,0.55)"; c.lineWidth = 1.2; c.stroke();
  });
}
function glowSprite(size, color) {
  return plate(size, size, (c, w) => {
    const g = c.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
    g.addColorStop(0, color(1)); g.addColorStop(0.25, color(0.55)); g.addColorStop(1, color(0));
    c.fillStyle = g; c.fillRect(0, 0, w, w);
  });
}
function blurred(src, px) { return plate(src.width + px * 4, src.height + px * 4, (c) => { c.filter = `blur(${px}px)`; c.drawImage(src, px * 2, px * 2); }); }

async function bake() {
  const fonts = [
    new FontFace("Inter", "url(./fonts/inter-latin-500-normal.woff2)", { weight: "500" }),
    new FontFace("Inter", "url(./fonts/inter-latin-600-normal.woff2)", { weight: "600" }),
    new FontFace("Inter", "url(./fonts/inter-latin-700-normal.woff2)", { weight: "700" }),
    new FontFace("Cormorant", "url(./fonts/cormorant-garamond-latin-500-normal.woff2)", { weight: "500" }),
    new FontFace("Cormorant", "url(./fonts/cormorant-garamond-latin-600-normal.woff2)", { weight: "600" }),
    new FontFace("Cormorant", "url(./fonts/cormorant-garamond-latin-500-italic.woff2)", { weight: "500", style: "italic" }),
    new FontFace("Cormorant", "url(./fonts/cormorant-garamond-latin-600-italic.woff2)", { weight: "600", style: "italic" }),
  ];
  for (const f of fonts) document.fonts.add(await f.load());
  CAPTIONS = await (await fetch("./audio/captions.json")).json();
  // A clean master (no captions) is rendered when variant.json says { "captions": false }.
  try { const v = await fetch("./variant.json"); if (v.ok && (await v.json()).captions === false) CAPTIONS = []; } catch {}
  IMGS = await Promise.all(LOOKS.map(async (L) => { const im = new Image(); im.src = L.file; await im.decode(); return im; }));
  GL = initGL();

  const r = seeded(20261119);
  // s01: shards drifting out from the mirror (image fractions; front ones big and soft)
  for (let k = 0; k < 18; k++) {
    const front = k < 3, size = front ? 120 + r() * 60 : 36 + r() * 64;
    let spr = shardSprite(r, Math.round(size));
    if (front) spr = blurred(spr, 3);
    const a = -1.3 + r() * 2.5;
    SHARDS.push({ spr, a, r0: 0.08 + r() * 0.3, v: (front ? 0.025 : 0.012) + r() * 0.018, rot: r() * 6.28, vr: (r() - 0.5) * 0.5, al: front ? 0.55 : 0.5 + r() * 0.35, ph: r() * 6.28 });
  }
  const p2 = [["rgba(214,163,140,0.95)", "rgba(169,92,101,0.9)", "#fff"], ["rgba(243,233,219,0.95)", "rgba(196,150,160,0.9)", "#a95c65"], ["rgba(169,92,101,0.95)", "rgba(90,50,66,0.9)", "#f3e9db"]];
  for (let k = 0; k < 20; k++) {
    const front = k < 3; let spr = petalSprite(r, Math.round(front ? 120 : 34 + r() * 40), p2); if (front) spr = blurred(spr, 4);
    PETALS2.push({ spr, x: r(), y: r(), v: 0.35 + r() * 0.6, rot: r() * 6.28, vr: (r() - 0.5) * 1.4, ph: r() * 6.28, al: front ? 0.6 : 0.85 });
  }
  for (let k = 0; k < 5; k++) FRAGS.push({ spr: blurred(fragSprite(r), 1), x: 0.08 + r() * 0.3, y: 0.12 + r() * 0.2, v: 0.02 + r() * 0.02, rot: (r() - 0.5) * 0.6, vr: (r() - 0.5) * 0.12, d: 0.6 + r() * 0.7 });
  for (let k = 0; k < 4; k++) THREADS.push({ y: 0.48 + k * 0.035 + r() * 0.02, x0: 0.18 + r() * 0.1, x1: 0.78 + r() * 0.12, ph: r() * 6.28, amp: 0.012 + r() * 0.012 });
  const gold = (a) => `rgba(255,214,150,${a})`;
  SPR.mote = glowSprite(28, gold);
  SPR.spark = glowSprite(40, (a) => `rgba(255,196,120,${a})`);
  SPR.warm = glowSprite(900, (a) => `rgba(255,226,180,${a * 0.9})`);
  for (let k = 0; k < 46; k++) MOTES.push({ x: r(), y: r(), v: 0.006 + r() * 0.012, s: 0.4 + r() * 0.9, ph: r() * 6.28, tw: 0.4 + r() });
  // s03: sparks travelling up three ribbon paths through the figure
  for (let k = 0; k < 70; k++) SPARKS.push({ path: k % 3, u: r(), v: 0.035 + r() * 0.04, s: 0.35 + r() * 0.9, off: (r() - 0.5) * 0.03, ph: r() * 6.28 });
  for (let k = 0; k < 10; k++) { const front = k < 2; let spr = paperSprite(r); if (front) spr = blurred(spr, 2); PAPERS.push({ spr, x: r(), y: r(), sc: front ? 1.15 : 0.5 + r() * 0.45, v: 0.008 + r() * 0.012, rot: r() * 6.28, vr: (r() - 0.5) * 0.25, ph: r() * 6.28, al: front ? 0.5 : 0.7 }); }
  const p5 = [["rgba(243,233,219,0.95)", "rgba(214,163,140,0.9)", "#d9b78d"], ["rgba(214,163,140,0.95)", "rgba(169,92,101,0.85)", "#f3e9db"], ["rgba(255,226,190,0.95)", "rgba(217,183,141,0.9)", "#a95c65"]];
  for (let k = 0; k < 24; k++) { const front = k < 4; let spr = petalSprite(r, Math.round(front ? 130 : 30 + r() * 46), p5); if (front) spr = blurred(spr, 5); PETALS5.push({ spr, x: r(), y: r(), v: 0.012 + r() * 0.02, rot: r() * 6.28, vr: (r() - 0.5) * 0.5, ph: r() * 6.28, al: front ? 0.55 : 0.85 }); }

  // grain: a soft tile laid over every frame (paint tooth, not salt and pepper)
  GRAIN = plate(384, 384, (c, w, h) => {
    const id = c.createImageData(w, h), g = seeded(5);
    for (let i = 0; i < w * h; i++) { const v = 128 + (g() + g() + g() - 1.5) * 70; id.data[i * 4] = id.data[i * 4 + 1] = id.data[i * 4 + 2] = v; id.data[i * 4 + 3] = 255; }
    c.putImageData(id, 0, 0);
  });
  GRAIN = plate(384, 384, (c) => { c.filter = "blur(0.6px)"; c.drawImage(GRAIN, 0, 0); });
  VIGNETTE = plate(W, H, (c) => {
    const g = c.createRadialGradient(W / 2, H * 0.46, H * 0.25, W / 2, H * 0.5, H * 0.72);
    g.addColorStop(0, "rgba(28,18,30,0)"); g.addColorStop(1, "rgba(28,18,30,0.55)");
    c.fillStyle = g; c.fillRect(0, 0, W, H);
  });
  // the soft plum backing a caption sits on: feathered, never a box
  BACKING = plate(1000, 200, (c, w, h) => {
    c.translate(w / 2, h / 2); c.scale(1, 0.2);
    const g = c.createRadialGradient(0, 0, 0, 0, 0, w / 2);
    g.addColorStop(0, "rgba(34,24,38,0.62)"); g.addColorStop(0.55, "rgba(34,24,38,0.42)"); g.addColorStop(1, "rgba(34,24,38,0)");
    c.fillStyle = g; c.beginPath(); c.arc(0, 0, w / 2, 0, 6.283); c.fill();
  });
}

// ── What moves over each painting ───────────────────────────────────────────
function sprite(spr, x, y, rot, sc, al) {
  if (al <= 0.003) return;
  ctx.save(); ctx.globalAlpha = al; ctx.translate(x, y); ctx.rotate(rot); ctx.scale(sc, sc);
  ctx.drawImage(spr, -spr.width / 2, -spr.height / 2); ctx.restore();
}
function motes(t, al, warm = 1) {
  ctx.globalCompositeOperation = "lighter";
  for (const m of MOTES) {
    const y = fract(m.y - m.v * t), x = m.x + 0.012 * Math.sin(t * 0.4 + m.ph);
    const tw = 0.55 + 0.45 * Math.sin(t * m.tw * 2 + m.ph);
    sprite(SPR.mote, x * W, y * H, 0, m.s, al * tw * 0.7 * warm);
  }
  ctx.globalCompositeOperation = "source-over";
}
function overS01(t, al) {      // shards drift out of the mirror, and speed off through the cut
  const c = toScreen(0, t, 0.7, 0.24);
  const fly = smooth((t - 3.6) / 0.9) * (t - 3.6) * 0.22;
  for (const s of SHARDS) {
    const rr = s.r0 + s.v * t + Math.max(0, fly) + 0.004 * Math.sin(t * 0.8 + s.ph);
    const x = c[0] + Math.cos(s.a) * rr * W * 1.2, y = c[1] + Math.sin(s.a) * rr * H * 0.75;
    sprite(s.spr, x, y, s.rot + s.vr * t, 1, s.al * al);
  }
  // a glint travelling round the gold rim of the mirror
  const g = toScreen(0, t, 0.7, 0.22), a = -2.4 + t * 0.55, rad = 0.29 * W * zoomAt(0, t);
  ctx.globalCompositeOperation = "lighter";
  sprite(SPR.spark, g[0] + Math.cos(a) * rad, g[1] + Math.sin(a) * rad * 1.02, 0, 2.2, 0.55 * al);
  ctx.globalCompositeOperation = "source-over";
}
function overS02(t, al) {      // memories float away; threads unravel; petals drift up and left
  const T = t - 4.05;
  for (const f of FRAGS) {
    const x = (f.x - f.v * T * 0.6) * W, y = (f.y - f.v * T) * H;
    const fade = smooth(1 - T / (5.5 * f.d));
    sprite(f.spr, x, y, f.rot + f.vr * T, 0.9, 0.5 * al * fade * smooth((T + 0.6) / 0.8));
  }
  ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.lineCap = "round";
  for (const th of THREADS) {
    const un = smooth(T / 6);                                       // the thread lets go from its right end
    const xa = th.x0 * W, xb = lerp(th.x1, th.x1 + 0.25, un) * W;
    ctx.strokeStyle = `rgba(232,196,140,${0.5 * al})`; ctx.lineWidth = 2;
    ctx.beginPath();
    for (let k = 0; k <= 40; k++) {
      const u = k / 40, x = lerp(xa, xb, u);
      const y = (th.y + th.amp * Math.sin(u * 9 + t * 1.3 + th.ph) * (0.3 + u) - un * u * u * 0.06) * H;
      k ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.stroke();
  }
  ctx.restore();
  for (const p of PETALS2) {
    const u = fract(p.x + p.v * 0.09 * t), x = (1.1 - u * 1.3) * W, y = (p.y * 0.8 + 0.15 - u * 0.25 + 0.02 * Math.sin(t * 0.9 + p.ph)) * H;
    sprite(p.spr, x, y, p.rot + p.vr * t, 1, p.al * al * smooth(u / 0.1) * smooth((1 - u) / 0.15));
  }
}
const RIBBONS = [  // three paths up through the figure (image fractions), as x of y
  (y) => 0.47 + 0.07 * Math.sin(y * 11 + 0.4) + 0.03 * Math.sin(y * 23),
  (y) => 0.55 + 0.1 * Math.sin(y * 7.5 + 2.1),
  (y) => 0.38 + 0.12 * Math.sin(y * 6.2 + 4.0),
];
function overS03(t, al) {      // small lights travel gently up the ribbons
  ctx.globalCompositeOperation = "lighter";
  for (const s of SPARKS) {
    const y = 0.95 - fract(s.u + s.v * t) * 0.85, x = RIBBONS[s.path](y) + s.off;
    const p = toScreen(2, t, x, y);
    const life = smooth((0.95 - y) / 0.08) * smooth((y - 0.1) / 0.1);
    sprite(SPR.spark, p[0], p[1], 0, s.s, al * life * (0.45 + 0.4 * Math.sin(t * 3 + s.ph)));
  }
  ctx.globalCompositeOperation = "source-over";
}
function overS04(t, al) {      // paper fragments: the old headlines, too soft to read, drifting
  for (const p of PAPERS) {
    const u = fract(p.y - p.v * t), x = (p.x + 0.03 * Math.sin(t * 0.3 + p.ph)) * W, y = (1.1 - u * 1.25) * H;
    sprite(p.spr, x, y, p.rot + p.vr * t, p.sc, p.al * al * smooth(u / 0.1) * smooth((1 - u) / 0.1));
  }
}
function overS05(t, al) {      // warm light opens from the upper right; petals rise and turn
  const k = smooth((t - 34.3) / 7.5);
  ctx.globalCompositeOperation = "screen";
  sprite(SPR.warm, 0.82 * W, 0.12 * H, 0, lerp(0.9, 2.0, k), al * lerp(0.18, 0.42, k));
  ctx.globalCompositeOperation = "source-over";
  for (const p of PETALS5) {
    const u = fract(p.y + p.v * t), x = (p.x + 0.05 * Math.sin(t * 0.35 + p.ph)) * W, y = (1.08 - u * 1.2) * H;
    sprite(p.spr, x, y, p.rot + p.vr * t, 1, p.al * al * smooth(u / 0.1) * smooth((1 - u) / 0.12));
  }
}
// The joins the brief asks for: a shard becomes a memory, a thread becomes a ribbon of light,
// the ribbon becomes the beam, a paper fragment warms into a petal.
function joins(t) {
  ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.lineCap = "round";
  const arc = (k, pts, width, a) => {
    if (a <= 0) return;
    ctx.strokeStyle = `rgba(255,206,140,${a})`; ctx.lineWidth = width; ctx.shadowColor = "rgba(255,190,110,0.9)"; ctx.shadowBlur = 18;
    ctx.beginPath(); const n = 50, m = Math.max(1, Math.round(n * k));
    for (let i = 0; i <= m; i++) { const [x, y] = pts(i / n); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
    ctx.stroke();
  };
  // 10.2: a thread stretches into a flowing ribbon of light
  { const k = smooth((t - 9.85) / 0.55), a = 0.75 * (1 - smooth((t - 10.25) / 0.45));
    if (t > 9.85 && t < 10.75) arc(k, (u) => [lerp(0.15, 0.9, u) * W, (0.52 - 0.12 * Math.sin(u * 3.1)) * H + 30 * Math.sin(u * 7 + t)], 3, a); }
  // 23.05: the golden ribbon becomes the curved beam of the balance
  { const k = smooth((t - 22.65) / 0.55), a = 0.7 * (1 - smooth((t - 23.1) / 0.45));
    if (t > 22.65 && t < 23.6) arc(k, (u) => [lerp(0.2, 0.8, u) * W, (0.5 - 0.05 * Math.sin(u * 3.14159)) * H], 4, a); }
  ctx.restore();
  // 34.5: a paper fragment drifts across and warms into a petal
  if (t > 33.9 && t < 35.2) {
    const k = smooth((t - 33.9) / 1.3), x = lerp(0.25, 0.62, k) * W, y = lerp(0.62, 0.42, k) * H;
    sprite(PAPERS[5].spr, x, y, t * 0.6, 0.9, 0.85 * (1 - smooth((k - 0.3) / 0.4)));
    sprite(PETALS5[6].spr, x, y, t * 0.6, 1.6, 0.9 * smooth((k - 0.3) / 0.4) * (1 - smooth((t - 34.9) / 0.3)));
  }
}

// ── Type ────────────────────────────────────────────────────────────────────
const IVORY = "#f3e9db", GOLD = "#d9b78d", LIT = "#f0c98c", PLUM = "#322a37";
function captionY(t) { return t >= 23.05 - 0.05 && t < 34.5 - 0.05 ? 1440 : 1240; }   // clear of the scales in s04
function caption(t) {
  const line = CAPTIONS.find((l) => t >= l.s && t < l.e);
  if (!line || t >= END_CARD - 0.4) return;
  const fin = smooth((t - line.s) / 0.1), y = captionY(line.s + 0.01) + (1 - fin) * 6;
  ctx.font = "600 58px Inter"; ctx.textBaseline = "alphabetic";
  const sp = ctx.measureText(" ").width;
  const parts = line.words.map((w) => ({ ...w, wd: ctx.measureText(w.w).width }));
  const total = parts.reduce((a, p) => a + p.wd, 0) + sp * (parts.length - 1);
  const sc = Math.min(1, 860 / total);
  ctx.save(); ctx.globalAlpha = fin;
  ctx.drawImage(BACKING, W / 2 - (total * sc + 260) / 2, y - 21 - 100, total * sc + 260, 200);
  ctx.translate(W / 2, y); ctx.scale(sc, sc);
  let x = -total / 2;
  for (const p of parts) {
    const lit = t >= p.s && t < p.e + 0.04;
    ctx.lineJoin = "round"; ctx.lineWidth = 6; ctx.strokeStyle = "rgba(28,18,30,0.8)";
    ctx.shadowColor = "rgba(0,0,0,0.45)"; ctx.shadowBlur = 12; ctx.shadowOffsetY = 2;
    ctx.strokeText(p.w, x, 0);
    ctx.shadowColor = "transparent";
    ctx.fillStyle = lit ? LIT : IVORY; ctx.fillText(p.w, x, 0);
    x += p.wd + sp;
  }
  ctx.restore();
}
function spaced(text, x, y, ls) { ctx.letterSpacing = `${ls}px`; ctx.fillText(text, x + ls / 2, y); ctx.letterSpacing = "0px"; }
function title(t) {            // Where Did I Go? — on frame 0, gone before the second shot
  const a = 1 - smooth((t - 3.3) / 0.6);
  if (a <= 0) return;
  ctx.save(); ctx.globalAlpha = a; ctx.textAlign = "center";
  ctx.shadowColor = "rgba(20,12,24,0.75)"; ctx.shadowBlur = 24;
  ctx.font = "600 112px Cormorant"; ctx.fillStyle = IVORY; ctx.fillText("Where Did I Go?", W / 2, 360);
  ctx.font = "600 26px Inter"; ctx.fillStyle = GOLD; spaced("MENOPAUSE  &  HRT", W / 2, 420, 7);
  ctx.restore();
}
function hrtType(t) {          // HRT, set by the editor, while she names it
  const a = smooth((t - 14.85) / 0.5) * (1 - smooth((t - 19.9) / 0.6));
  if (a <= 0) return;
  const rise = (1 - smooth((t - 14.85) / 0.7)) * 14;
  ctx.save(); ctx.globalAlpha = a; ctx.textAlign = "center";
  ctx.shadowColor = "rgba(40,16,30,0.8)"; ctx.shadowBlur = 30;
  ctx.font = "600 200px Cormorant";
  const g = ctx.createLinearGradient(0, 560, 0, 760); g.addColorStop(0, "#fff4e2"); g.addColorStop(1, "#e3bd86");
  ctx.fillStyle = g; spaced("HRT", W / 2, 760 + rise, 30);
  ctx.shadowBlur = 16; ctx.font = "600 27px Inter"; ctx.fillStyle = IVORY; spaced("HORMONE REPLACEMENT THERAPY", W / 2, 820 + rise, 6);
  ctx.restore();
}
function endCard(t) {
  const k = smooth((t - (END_CARD - 0.4)) / 0.8);
  if (k <= 0) return;
  ctx.save(); ctx.globalAlpha = 0.93 * k; ctx.fillStyle = PLUM; ctx.fillRect(0, 0, W, H);
  ctx.globalAlpha = 0.5 * k; ctx.drawImage(VIGNETTE, 0, 0);
  ctx.globalCompositeOperation = "screen"; ctx.globalAlpha = 0.16 * k; ctx.drawImage(SPR.warm, W / 2 - 600, 980 - 600, 1200, 1200);
  ctx.restore();
  motes(t, 0.7 * k);
  const a = smooth((t - END_CARD) / 0.6), b = smooth((t - END_CARD - 0.45) / 0.6);
  ctx.save(); ctx.textAlign = "center";
  ctx.globalAlpha = a; ctx.font = "italic 500 96px Cormorant"; ctx.fillStyle = IVORY;
  ctx.fillText("Menopause doesn’t mean", W / 2, 850 - (1 - a) * 10); ctx.fillText("losing yourself.", W / 2, 962 - (1 - a) * 10);
  ctx.globalAlpha = b; ctx.strokeStyle = GOLD; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(W / 2 - 60, 1060); ctx.lineTo(W / 2 + 60, 1060); ctx.stroke();
  ctx.font = "700 76px Inter"; ctx.fillStyle = GOLD; spaced("FRH", W / 2, 1176, 30);
  ctx.font = "500 27px Inter"; spaced("FEMALE REPRODUCTIVE HEALTH", W / 2, 1232, 8);
  ctx.restore();
}

// ── The frame ───────────────────────────────────────────────────────────────
function draw(t) {
  drawPaintings(t);
  const w = (i) => weight(i, t);
  if (t < 4.7) overS01(t, w(0) * (t > 3.9 ? 1 - smooth((t - 3.9) / 0.6) : 1));
  if (w(1) > 0) overS02(t, w(1));
  if (w(2) > 0) overS03(t, w(2));
  if (w(3) > 0) overS04(t, w(3));
  if (w(4) > 0) overS05(t, w(4));
  joins(t);
  motes(t, 0.5 + 0.4 * smooth((t - 34) / 4));
  title(t); hrtType(t);
  // the finish: grain, then the vignette
  const f = Math.floor(t * FPS), g = seeded(1000 + f);
  ctx.save(); ctx.globalCompositeOperation = "soft-light"; ctx.globalAlpha = 0.32;
  const ox = Math.floor(g() * 384), oy = Math.floor(g() * 384);
  for (let y = -oy; y < H; y += 384) for (let x = -ox; x < W; x += 384) ctx.drawImage(GRAIN, x, y);
  ctx.restore();
  ctx.drawImage(VIGNETTE, 0, 0);
  endCard(t);
  caption(t);
}

window.film = {
  duration: DURATION, fps: FPS, width: W, height: H,
  shots: SHOTS.map(({ id, start, end, also }) => ({ id, start, end, also })),
  ready: bake(),
  seek(t) { draw(clamp(t, 0, DURATION - 1e-6)); },
};
