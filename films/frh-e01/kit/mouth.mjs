#!/usr/bin/env node
/**
 * How open each character's mouth is on every frame, from their own voice.
 *
 *   node kit/mouth.mjs --duration 46 mira=audio/voice-mira.wav corin=audio/voice-corin.wav
 *   --fps 30   --out audio/mouth.json   --words audio/words.json (shuts the mouth between words)
 *
 * Each file is that character's voice alone, on the film's timeline (silence where they do not
 * speak). Result: { fps, duration, mouth: { mira: [0, 0, 0.82, …] } } with one value from 0 to 1
 * a frame. Draw three states from it: shut under 0.12, a small oval, open with a hint of teeth.
 */
import fs from "node:fs";
import { spawnSync } from "node:child_process";
import { args, die } from "./lib.mjs";

const a = args();
const fps = +a.fps || 30;
const pairs = a._.map((x) => x.split("=")).filter((p) => p.length === 2);
if (!pairs.length) die("Name each voice:  node kit/mouth.mjs --duration 46 mira=audio/voice-mira.wav");
const RATE = 16000;
const words = a.words && fs.existsSync(a.words) ? JSON.parse(fs.readFileSync(a.words, "utf8")) : null;
const wordList = words ? (Array.isArray(words) ? words : words.words || []) : [];
const mouth = {};
let duration = +a.duration || 0;

for (const [name, file] of pairs) {
  if (!fs.existsSync(file)) die(`No file at ${file}.`);
  const r = spawnSync("ffmpeg", ["-v", "error", "-i", file, "-ac", "1", "-ar", String(RATE), "-f", "f32le", "-"], { maxBuffer: 1 << 30 });
  if (r.error || r.status !== 0) die(`ffmpeg could not read ${file}.`);
  const pcm = new Float32Array(r.stdout.buffer, r.stdout.byteOffset, Math.floor(r.stdout.byteLength / 4));
  if (!duration) duration = pcm.length / RATE;
  const frames = Math.round(duration * fps);
  const raw = new Array(frames).fill(0);
  const win = RATE / fps;
  for (let f = 0; f < frames; f++) {
    const s = Math.floor(f * win), e = Math.min(pcm.length, Math.floor((f + 1) * win));
    let sum = 0;
    for (let i = s; i < e; i++) sum += pcm[i] * pcm[i];
    raw[f] = e > s ? Math.sqrt(sum / (e - s)) : 0;
  }
  // The loud end of this voice is "wide open": a quiet speaker still opens their mouth.
  const sorted = raw.filter((x) => x > 0).sort((x, y) => x - y);
  const top = sorted.length ? sorted[Math.floor(sorted.length * 0.95)] : 1;
  let prev = 0;
  const track = raw.map((x) => {
    let v = Math.min(1, x / (top || 1));
    if (v < 0.1) v = 0;
    // Opens fast, closes a little slower, so it does not buzz.
    v = v > prev ? prev + (v - prev) * 0.85 : prev + (v - prev) * 0.6;
    prev = v;
    return v;
  });
  if (wordList.length) {
    const mine = wordList.filter((w) => !w.speaker || w.speaker === name).map((w) => [+(w.s ?? w.start), +(w.e ?? w.end)]);
    for (let f = 0; f < frames; f++) {
      const t = (f + 0.5) / fps;
      if (!mine.some(([s, e]) => t >= s - 0.02 && t <= e + 0.04)) track[f] = 0;
    }
  }
  mouth[name] = track.map((v) => +v.toFixed(2));
  const open = mouth[name].filter((v) => v > 0.12).length;
  console.log(`${name}: ${frames} frames, mouth open on ${open} (${((open / frames) * 100).toFixed(0)}%)`);
}
const outFile = a.out || "audio/mouth.json";
fs.writeFileSync(outFile, JSON.stringify({ fps, duration: +duration.toFixed(3), mouth }));
console.log(`→ ${outFile}`);
