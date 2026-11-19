#!/usr/bin/env node
/**
 * The score for THE QUIET BLADE, written in code. 16 s, 48 kHz stereo.
 *   node score.mjs        → audio/music.wav (zither, flute, drone, bell)
 *                           audio/wind.wav  (the wind bed, with the gust at 9.4–11 s)
 *                           audio/hit.wav   (the drum and the steel at 7.0 s; the file starts at 0)
 * Everything is seeded: the same file every run.
 */
import fs from "node:fs";

const SR = 48000, D = 16, N = SR * D;
function seeded(seed) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const buf = () => [new Float32Array(N), new Float32Array(N)];
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const smooth = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };
const pan = (p) => [Math.cos((p + 1) * Math.PI / 4), Math.sin((p + 1) * Math.PI / 4)];
function add(dst, mono, at, gain, p = 0) { const [gl, gr] = pan(p); const o = Math.round(at * SR); for (let i = 0; i < mono.length && o + i < N; i++) { dst[0][o + i] += mono[i] * gain * gl; dst[1][o + i] += mono[i] * gain * gr; } }

// A plucked silk string: Karplus-Strong with a soft pick and a slow bend into the note.
function pluck(freq, dur, { seed = 1, bright = 0.5, bend = 0.0, decay = 0.996 } = {}) {
  const n = Math.round(dur * SR), out = new Float32Array(n), r = seeded(seed);
  const maxLen = Math.ceil(SR / (freq * 0.9)) + 4, line = new Float32Array(maxLen);
  const len0 = SR / freq;
  for (let i = 0; i < maxLen; i++) line[i] = (r() * 2 - 1);
  // soften the pick: two passes of averaging, mixed by brightness
  for (let p = 0; p < 2; p++) for (let i = 1; i < maxLen; i++) line[i] = line[i] * bright + line[i - 1] * (1 - bright);
  let w = 0, prev = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const f = freq * (1 + bend * Math.exp(-t * 9));             // starts a little sharp or flat and settles
    const len = SR / f;
    const rp = (w - len + maxLen * 4) % maxLen, i0 = Math.floor(rp), fr = rp - i0;
    const s = line[i0 % maxLen] * (1 - fr) + line[(i0 + 1) % maxLen] * fr;
    const y = (s + prev) * 0.5 * decay; prev = s;
    line[w] = y; w = (w + 1) % maxLen;
    out[i] = s * Math.min(1, t * 400) * smooth((dur - t) / 0.25);
  }
  return out;
}

// A bamboo flute: a sine with two soft partials, breath, late vibrato, a scoop into the pitch.
function flute(notes, { seed = 5 } = {}) {       // notes: [{f, s, e}] glued legato into one breath
  const s0 = notes[0].s, e1 = notes[notes.length - 1].e, n = Math.round((e1 - s0 + 0.6) * SR), out = new Float32Array(n), r = seeded(seed);
  let ph = 0, lp = 0, lp2 = 0;
  for (let i = 0; i < n; i++) {
    const t = s0 + i / SR, rel = t - s0;
    let f = notes[notes.length - 1].f;
    for (let k = 0; k < notes.length; k++) { const a = notes[k]; if (t < a.e || k === notes.length - 1) { f = a.f; if (k > 0) { const g = smooth((t - a.s) / 0.09 + 1); f = notes[k - 1].f * Math.pow(a.f / notes[k - 1].f, g); } break; } }
    f *= 1 - 0.035 * Math.exp(-rel * 14);                                          // the scoop
    f *= 1 + 0.006 * smooth((rel - 0.5) / 0.6) * Math.sin(2 * Math.PI * 4.8 * t);  // vibrato arrives late
    ph += (2 * Math.PI * f) / SR;
    const env = smooth(rel / 0.22) * smooth((e1 + 0.5 - t) / 0.7) * (0.82 + 0.18 * Math.sin(2 * Math.PI * 0.6 * t + 1));
    const noise = r() * 2 - 1;
    lp += (noise - lp) * Math.min(1, (2 * Math.PI * f * 2.2) / SR); lp2 += (lp - lp2) * Math.min(1, (2 * Math.PI * f * 2.2) / SR);
    const breath = (lp2) * (0.22 + 0.5 * Math.exp(-rel * 10));
    out[i] = env * (Math.sin(ph) * 0.72 + Math.sin(2 * ph + 0.3) * 0.17 + Math.sin(3 * ph) * 0.06 + breath * 0.55);
  }
  return { out, at: s0 };
}

function drum() {
  const n = Math.round(2.2 * SR), out = new Float32Array(n), r = seeded(11); let ph = 0, lp = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR, f = 46 + 70 * Math.exp(-t * 16);
    ph += (2 * Math.PI * f) / SR;
    lp += ((r() * 2 - 1) - lp) * 0.18;
    out[i] = Math.sin(ph) * Math.exp(-t * 2.6) * Math.min(1, t * 900) + Math.sin(ph * 1.52) * 0.25 * Math.exp(-t * 6) + lp * 0.5 * Math.exp(-t * 38);
  }
  return out;
}
function steel() {      // a short breath of steel leaving the scabbard
  const n = Math.round(0.6 * SR), out = new Float32Array(n), r = seeded(21); let a = 0, b = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR, fc = 1800 + 7000 * smooth(t / 0.3), w = Math.min(1, (2 * Math.PI * fc) / SR);
    const x = r() * 2 - 1; a += (x - a) * w; b += (a - b) * 0.08;
    out[i] = (a - b) * smooth(t / 0.05) * Math.exp(-Math.max(0, t - 0.12) * 11) + Math.sin(2 * Math.PI * 5200 * t) * 0.05 * Math.exp(-t * 7);
  }
  return out;
}
function bell(f0, dur) {
  const n = Math.round(dur * SR), out = new Float32Array(n);
  const parts = [[0.5, 0.5, 0.35], [1, 1, 0.6], [1.003, 0.8, 0.6], [2.0, 0.42, 0.9], [2.76, 0.35, 1.3], [4.07, 0.16, 2.0], [5.4, 0.1, 2.8]];
  for (let i = 0; i < n; i++) { const t = i / SR; let s = 0; for (const [m, a, d] of parts) s += a * Math.sin(2 * Math.PI * f0 * m * t) * Math.exp(-t * d); out[i] = s * Math.min(1, t * 300) * smooth((dur - t) / 0.4) * 0.5; }
  return out;
}
function drone(f, s, e) {
  const n = Math.round((e - s) * SR), out = new Float32Array(n);
  for (let i = 0; i < n; i++) { const t = i / SR, env = smooth(t / 1.4) * smooth((e - s - t) / 1.8); out[i] = env * (Math.sin(2 * Math.PI * f * t) * 0.7 + Math.sin(2 * Math.PI * f * 1.5 * t + 1) * 0.22 + Math.sin(2 * Math.PI * f * 2.005 * t) * 0.16) * (0.9 + 0.1 * Math.sin(2 * Math.PI * 0.21 * t)); }
  return out;
}
function wind(seed, gust) {
  const out = new Float32Array(N), r = seeded(seed); let a = 0, b = 0, c = 0;
  for (let i = 0; i < N; i++) {
    const t = i / SR;
    const g = gust(t), fc = 240 + 420 * g + 90 * Math.sin(2 * Math.PI * 0.13 * t + seed), w = (2 * Math.PI * fc) / SR;
    const x = r() * 2 - 1; a += (x - a) * w; b += (a - b) * w; c += (b - c) * 0.004;
    out[i] = (b - c) * (0.5 + 1.1 * g) * (0.8 + 0.2 * Math.sin(2 * Math.PI * 0.31 * t + seed * 2));
  }
  return out;
}
// A small hall: four combs and two all-passes a side.
function reverb(st, wet = 0.22) {
  const res = buf();
  for (let ch = 0; ch < 2; ch++) {
    const x = st[ch], y = new Float32Array(N);
    for (const ms of ch ? [31.7, 37.9, 42.3, 47.1] : [29.7, 35.3, 41.1, 45.7]) {
      const d = Math.round((ms / 1000) * SR), line = new Float32Array(d); let p = 0, lp = 0;
      for (let i = 0; i < N; i++) { const o = line[p]; lp = o * 0.65 + lp * 0.35; line[p] = x[i] + lp * 0.84; p = (p + 1) % d; y[i] += o * 0.25; }
    }
    for (const ms of ch ? [5.3, 1.9] : [5.0, 1.7]) {
      const d = Math.round((ms / 1000) * SR), line = new Float32Array(d); let p = 0;
      for (let i = 0; i < N; i++) { const o = line[p], v = y[i] + o * 0.5; line[p] = v; p = (p + 1) % d; y[i] = o - v * 0.5; }
    }
    for (let i = 0; i < N; i++) res[ch][i] = x[i] * (1 - wet * 0.4) + y[i] * wet;
  }
  return res;
}
function master(st, peak) {
  let m = 0; for (const c of st) for (let i = 0; i < N; i++) m = Math.max(m, Math.abs(c[i]));
  const g = peak / (m || 1);
  for (const c of st) for (let i = 0; i < N; i++) { const t = i / SR; c[i] *= g * smooth(t / 0.02) * smooth((D - t) / 0.5); }
  return st;
}
function wav(file, st) {
  const b = Buffer.alloc(44 + N * 4);
  b.write("RIFF", 0); b.writeUInt32LE(36 + N * 4, 4); b.write("WAVEfmt ", 8); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(2, 22);
  b.writeUInt32LE(SR, 24); b.writeUInt32LE(SR * 4, 28); b.writeUInt16LE(4, 32); b.writeUInt16LE(16, 34); b.write("data", 36); b.writeUInt32LE(N * 4, 40);
  for (let i = 0; i < N; i++) { b.writeInt16LE(Math.round(clamp(st[0][i], -1, 1) * 32767), 44 + i * 4); b.writeInt16LE(Math.round(clamp(st[1][i], -1, 1) * 32767), 46 + i * 4); }
  fs.writeFileSync(file, b); console.log(`${file} · ${D} s`);
}

// ── The score ───────────────────────────────────────────────────────────────
const F = { D2: 73.42, A2: 110, D3: 146.83, F3: 174.61, G3: 196, A3: 220, C4: 261.63, D4: 293.66, F4: 349.23, G4: 392, A4: 440, C5: 523.25, D5: 587.33, A5: 880 };
const music = buf();
// The climb: one plucked note a step, rising.
const Z = [
  [0.30, "D3", 0.9, -0.25, 0.012], [1.12, "A3", 0.75, 0.15, -0.01], [1.94, "D4", 0.7, -0.1, 0.014], [2.62, "C4", 0.55, 0.3, 0], [3.28, "A3", 0.6, -0.3, 0.01],
  [4.70, "D3", 0.42, 0.2, 0], [5.86, "G3", 0.4, -0.2, 0.012],
  [6.40, "D2", 0.8, 0, 0.02],
  [8.25, "A5", 0.16, 0.4, 0], [9.35, "D5", 0.2, -0.4, 0],
  [12.40, "D3", 0.7, -0.3, 0.01], [12.72, "A3", 0.55, -0.1, 0], [13.02, "D4", 0.55, 0.1, 0.01], [13.34, "F4", 0.5, 0.25, 0], [13.72, "A4", 0.48, 0.35, 0.008],
  [14.60, "D3", 0.7, -0.2, 0.01], [14.63, "D4", 0.5, 0.2, 0.01],
];
Z.forEach(([at, n, g, p, bend], i) => add(music, pluck(F[n], Math.min(5.5, D - at), { seed: 100 + i, bright: F[n] > 500 ? 0.35 : 0.55, bend, decay: F[n] < 100 ? 0.9985 : 0.9972 }), at, g * 0.5, p));
// The flute: one breath over the master, one to close.
for (const [ph, g, p] of [
  [[{ f: F.A4, s: 3.5, e: 4.55 }, { f: F.C5, s: 4.55, e: 5.05 }, { f: F.D5, s: 5.05, e: 6.0 }], 0.2, 0.12],
  [[{ f: F.D5, s: 12.5, e: 13.4 }, { f: F.C5, s: 13.4, e: 13.8 }, { f: F.A4, s: 13.8, e: 14.35 }, { f: F.F4, s: 14.35, e: 14.75 }, { f: F.D4, s: 14.75, e: 15.3 }], 0.2, -0.1],
]) { const n = flute(ph, { seed: 5 + Math.round(ph[0].s) }); add(music, n.out, n.at, g, p); }
add(music, drone(F.D2, 6.3, 11.7), 6.3, 0.16, 0);          // the held breath between the draw and the bell
add(music, bell(F.D3 * 1.0, 5.3), 10.6, 0.5, 0.05);       // the turn
wav("audio/music.wav", master(reverb(music, 0.3), 0.7));

const gust = (t) => 0.32 + 0.1 * Math.sin(2 * Math.PI * 0.09 * t) + 0.75 * smooth((t - 9.2) / 0.9) * smooth((11.6 - t) / 1.4) + 0.25 * smooth((7.25 - t) / 0.25) * smooth((t - 6.95) / 0.1);
wav("audio/wind.wav", master([wind(3, gust), wind(4, gust)], 0.2));

const hit = buf();
add(hit, steel(), 6.96, 0.35, 0.2);
add(hit, drum(), 7.0, 0.95, 0);
wav("audio/hit.wav", master(reverb(hit, 0.18), 0.85));
