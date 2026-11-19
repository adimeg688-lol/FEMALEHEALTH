#!/usr/bin/env node
/**
 * The score for FRH E01 · WHERE DID I GO?, written in code. 45 s, 48 kHz stereo, no vocals.
 *   node score.mjs   → audio/music.wav
 * Sparse felt piano over soft sustained strings. Introspective (D minor) at the start, measured
 * through the risks, warm (Bb → F major) from "Ask your doctor", no climax, room for the voice.
 * Seeded: the same file every run.
 */
import fs from "node:fs";

const SR = 48000, D = 45, N = SR * D;
function seeded(seed) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const smooth = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };
const pan = (p) => [Math.cos((p + 1) * Math.PI / 4), Math.sin((p + 1) * Math.PI / 4)];
const buf = () => [new Float32Array(N), new Float32Array(N)];
function add(dst, mono, at, gain, p = 0) { const [gl, gr] = pan(p); const o = Math.round(at * SR); for (let i = 0; i < mono.length && o + i < N; i++) { if (o + i < 0) continue; dst[0][o + i] += mono[i] * gain * gl; dst[1][o + i] += mono[i] * gain * gr; } }
const NOTE = { C: 0, "C#": 1, Db: 1, D: 2, Eb: 3, E: 4, F: 5, "F#": 6, G: 7, Ab: 8, A: 9, Bb: 10, B: 11 };
const hz = (n) => { const m = /^([A-G][b#]?)(\d)$/.exec(n); return 440 * Math.pow(2, (NOTE[m[1]] + 12 * (+m[2] + 1) - 69) / 12); };

// Felt piano: slightly stretched partials, soft hammer, fast-then-slow decay, low-passed.
function piano(f, dur, vel = 0.6, seed = 1) {
  const n = Math.round(dur * SR), out = new Float32Array(n), r = seeded(seed);
  const parts = [[1, 1], [2, 0.42], [3, 0.16], [4, 0.07], [5, 0.035], [6, 0.015]];
  const B = 0.00025;
  let lp = 0, nz = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    let s = 0;
    for (const [k, a] of parts) {
      const fk = f * k * Math.sqrt(1 + B * k * k);
      const dk = 1.6 + k * 0.9 + f / 400;
      s += a * Math.sin(2 * Math.PI * fk * t + k) * (0.55 * Math.exp(-t * dk * 1.4) + 0.45 * Math.exp(-t * dk * 0.28));
    }
    nz += ((r() * 2 - 1) - nz) * 0.12;                         // the felt on the string
    s += nz * 0.25 * Math.exp(-t * 60);
    const w = 0.12 + 0.18 * vel;
    lp += (s - lp) * w;
    out[i] = lp * Math.min(1, t * 220) * smooth((dur - t) / 0.4) * vel;
  }
  return out;
}

// Strings: detuned soft saws, low-passed, slow bow in and out, gentle vibrato.
function strings(notes, s, e, seed = 3) {
  const n = Math.round((e - s) * SR), out = new Float32Array(n);
  const voices = notes.flatMap((nm, j) => [-1, 1].map((d) => ({ f: hz(nm), det: 1 + d * 0.0022 * (1 + j * 0.2), ph: (j * 1.7 + d) % 6.28 })));
  let lp1 = 0, lp2 = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR, env = smooth(t / 1.6) * smooth((e - s - t) / 1.8);
    let x = 0;
    for (const v of voices) {
      const vib = 1 + 0.0028 * Math.sin(2 * Math.PI * 5.1 * (s + t) + v.ph);
      const p = ((v.f * v.det * vib * (s + t)) + v.ph / 6.28) % 1;
      x += (2 * p - 1) * 0.5 + Math.sin(2 * Math.PI * p) * 0.5;
    }
    x /= voices.length;
    const w = Math.min(1, (2 * Math.PI * (700 + 260 * Math.sin(2 * Math.PI * 0.07 * (s + t) + seed))) / SR);
    lp1 += (x - lp1) * w; lp2 += (lp1 - lp2) * w;
    out[i] = lp2 * env;
  }
  return out;
}

// A small hall: four combs and two all-passes a side.
function reverb(st, wet = 0.3) {
  const res = buf();
  for (let ch = 0; ch < 2; ch++) {
    const x = st[ch], y = new Float32Array(N);
    for (const ms of ch ? [31.7, 37.9, 42.3, 47.1] : [29.7, 35.3, 41.1, 45.7]) {
      const d = Math.round((ms / 1000) * SR), line = new Float32Array(d); let p = 0, lp = 0;
      for (let i = 0; i < N; i++) { const o = line[p]; lp = o * 0.6 + lp * 0.4; line[p] = x[i] + lp * 0.86; p = (p + 1) % d; y[i] += o * 0.25; }
    }
    for (const ms of ch ? [5.3, 1.9] : [5.0, 1.7]) {
      const d = Math.round((ms / 1000) * SR), line = new Float32Array(d); let p = 0;
      for (let i = 0; i < N; i++) { const o = line[p], v = y[i] + o * 0.5; line[p] = v; p = (p + 1) % d; y[i] = o - v * 0.5; }
    }
    for (let i = 0; i < N; i++) res[ch][i] = x[i] * (1 - wet * 0.4) + y[i] * wet;
  }
  return res;
}

// ── The arc, on the film's timeline (cuts at 4.7, 11.0, 23.45, 33.95; end card 41.6) ─────────
const CHORDS = [
  { s: 0.0, e: 5.2, pad: ["D3", "A3", "F4"], tones: ["D5", "A4", "F4", "E5"], gain: 0.55 },
  { s: 4.6, e: 8.2, pad: ["Bb2", "F3", "D4", "A4"], tones: ["D5", "F5", "A4"], gain: 0.6 },
  { s: 7.8, e: 11.5, pad: ["G2", "D3", "Bb3", "F4"], tones: ["Bb4", "D5", "F4"], gain: 0.6 },
  { s: 10.95, e: 17.6, pad: ["F2", "C3", "A3", "E4"], tones: ["C5", "A4", "E5", "G4"], gain: 0.65 },
  { s: 17.1, e: 23.9, pad: ["C3", "G3", "E4"], tones: ["G4", "E5", "C5"], gain: 0.65 },
  { s: 23.4, e: 30.0, pad: ["G2", "D3", "F3", "Bb3"], tones: ["D5", "Bb4", "F4"], gain: 0.6 },
  { s: 29.6, e: 34.4, pad: ["A2", "E3", "D4", "A3"], tones: ["E5", "A4", "D5"], gain: 0.62 },
  { s: 33.9, e: 38.1, pad: ["Bb2", "F3", "D4", "A4"], tones: ["F5", "D5", "A4", "C5"], gain: 0.72 },
  { s: 37.7, e: 45.0, pad: ["F2", "C3", "A3", "C4", "F4"], tones: ["A4", "C5", "F5"], gain: 0.78 },
];
const st = buf();
CHORDS.forEach((c, k) => {
  add(st, strings(c.pad, c.s, c.e, k + 1), c.s, 0.32 * c.gain, k % 2 ? 0.15 : -0.15);
});
// The piano: sparse, a note every 1.2–1.6 s, sitting in the voice's breaths more than on its words.
const r = seeded(42);
let seed = 100;
for (let k = 0; k < CHORDS.length; k++) {
  const c = CHORDS[k], next = CHORDS[k + 1];
  const end = next ? next.s + 0.3 : 40.2;
  let t = c.s + 0.25 + (k === 0 ? 0.0 : 0.2);
  let j = 0;
  while (t < end - 0.3) {
    const f = hz(c.tones[j % c.tones.length]);
    add(st, piano(f, 4.2, 0.42 + 0.12 * r(), seed++), t, 0.36, (r() - 0.5) * 0.5);
    if (j === 0) add(st, piano(f / 4, 4.5, 0.5, seed++), t, 0.22, -0.2);   // the low root under each chord
    t += 1.25 + r() * 0.4; j++;
  }
}
// The last chord, let ring under the end card.
for (const [nm, g] of [["F2", 0.25], ["C4", 0.3], ["F4", 0.33], ["A4", 0.3], ["C5", 0.26]]) add(st, piano(hz(nm), 3.4, 0.5, seed++), 40.7 + g * 0.08, g, 0);

const wet = reverb(st, 0.34);
// Fade in over the first 0.15 s (no click) and out over the last 1.4 s.
for (let i = 0; i < N; i++) { const t = i / SR, g = smooth(t / 0.15) * smooth((D - t) / 1.4); wet[0][i] *= g; wet[1][i] *= g; }
let m = 0; for (const c of wet) for (let i = 0; i < N; i++) m = Math.max(m, Math.abs(c[i]));
const gain = 0.7 / (m || 1);
const pcm = Buffer.alloc(44 + N * 4);
pcm.write("RIFF", 0); pcm.writeUInt32LE(36 + N * 4, 4); pcm.write("WAVEfmt ", 8); pcm.writeUInt32LE(16, 16); pcm.writeUInt16LE(1, 20); pcm.writeUInt16LE(2, 22);
pcm.writeUInt32LE(SR, 24); pcm.writeUInt32LE(SR * 4, 28); pcm.writeUInt16LE(4, 32); pcm.writeUInt16LE(16, 34); pcm.write("data", 36); pcm.writeUInt32LE(N * 4, 40);
for (let i = 0; i < N; i++) for (let ch = 0; ch < 2; ch++) pcm.writeInt16LE(Math.round(clamp(wet[ch][i] * gain, -1, 1) * 32767), 44 + i * 4 + ch * 2);
fs.mkdirSync("audio", { recursive: true });
fs.writeFileSync("audio/music.wav", pcm);
// What can be checked without ears: the level of every second.
const lv = []; for (let s = 0; s < D; s++) { let q = 0; for (let i = s * SR; i < (s + 1) * SR; i++) q += (wet[0][i] * gain) ** 2; lv.push(Math.round(10 * Math.log10(q / SR + 1e-12))); }
console.log("music → audio/music.wav · 45 s · dB each second:", lv.join(" "));
