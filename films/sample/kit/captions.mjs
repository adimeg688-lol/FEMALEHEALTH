#!/usr/bin/env node
/**
 * Turns the words and their times into short caption lines.
 *
 *   node kit/captions.mjs audio/words.json            → audio/captions.json
 *   --max 22        the longest a line may be, in characters
 *   --tail 0.15     seconds a line stays after its last word
 *   --gap 0.35      a pause this long always starts a new line
 *   --one           one word at a time (list explainers)
 *
 * words.json: [{ "w": "The", "s": 0.12, "e": 0.31, "speaker": "narrator" }, …]  (word/start/end are read too)
 * A line shows from its first word to its last word plus the tail, never into the next line.
 */
import fs from "node:fs";
import path from "node:path";
import { args, die } from "./lib.mjs";

export function chunk(words, { max = 22, tail = 0.15, gap = 0.35, one = false } = {}) {
  const ws = words.map((x) => ({ w: String(x.w ?? x.word ?? "").trim(), s: +(x.s ?? x.start), e: +(x.e ?? x.end), speaker: x.speaker })).filter((x) => x.w && Number.isFinite(x.s) && Number.isFinite(x.e));
  const lines = [];
  let cur = [];
  const flush = () => { if (cur.length) lines.push(cur); cur = []; };
  for (let i = 0; i < ws.length; i++) {
    const x = ws[i];
    const text = cur.map((c) => c.w).join(" ");
    const prev = cur[cur.length - 1];
    const tooLong = cur.length && (text + " " + x.w).length > max;
    const paused = prev && x.s - prev.e > gap;
    const turn = prev && prev.speaker !== x.speaker;
    if (one || tooLong || paused || turn) flush();
    cur.push(x);
    // A full stop, a comma, a dash: the line ends where the voice does.
    if (/[.!?;:,—–]["')\]]?$/.test(x.w) && cur.map((c) => c.w).join(" ").length >= Math.min(8, max)) flush();
    else if (/[.!?]["')\]]?$/.test(x.w)) flush();
  }
  flush();
  // A lone short word at the end of a sentence reads badly: give it to the line before when it fits.
  for (let i = lines.length - 1; i > 0; i--) {
    const l = lines[i], p = lines[i - 1];
    if (!one && l.length === 1 && l[0].w.length <= 4 && l[0].s - p[p.length - 1].e <= gap && p[p.length - 1].speaker === l[0].speaker && (p.map((c) => c.w).join(" ") + " " + l[0].w).length <= max && !/[.!?]["')\]]?$/.test(p[p.length - 1].w)) {
      p.push(l[0]);
      lines.splice(i, 1);
    }
  }
  return lines.map((l, i) => {
    const next = lines[i + 1];
    const s = l[0].s;
    const e = Math.min(l[l.length - 1].e + tail, next ? next[0].s : Infinity);
    return { s: +s.toFixed(3), e: +e.toFixed(3), text: l.map((c) => c.w).join(" "), ...(l[0].speaker ? { speaker: l[0].speaker } : {}), words: l.map((c) => ({ w: c.w, s: +c.s.toFixed(3), e: +c.e.toFixed(3) })) };
  });
}

/** A plain list, { words }, or the JSON that `whisper --word_timestamps True --output_format json` writes. */
export function fromAny(raw) {
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw.words)) return raw.words;
  if (Array.isArray(raw.segments)) return raw.segments.flatMap((seg) => (seg.words || []).map((w) => ({ w: String(w.word).trim(), s: +w.start, e: +w.end }))).filter((w) => w.w);
  return null;
}

if (process.argv[1]?.endsWith("captions.mjs")) {
  const a = args();
  const input = a._[0];
  if (!input || !fs.existsSync(input)) die("Give it the words:  node kit/captions.mjs audio/words.json");
  const raw = JSON.parse(fs.readFileSync(input, "utf8"));
  const words = fromAny(raw);
  if (!Array.isArray(words)) die("Give it a list of words, { words: [...] }, or Whisper's JSON made with --word_timestamps True.");
  // Whisper's file is turned into words.json too, so the film and the mouth tracks read one format.
  if (raw.segments) fs.writeFileSync(path.join(path.dirname(input), "words.json"), JSON.stringify(words.map((x) => ({ w: x.w, s: x.s, e: x.e })), null, 1));
  const max = +a.max || 22;
  const lines = chunk(words, { max, tail: a.tail ? +a.tail : 0.15, gap: a.gap ? +a.gap : 0.35, one: !!a.one });
  const outFile = a.out || path.join(path.dirname(input), "captions.json");
  fs.writeFileSync(outFile, JSON.stringify(lines, null, 2));
  const long = lines.filter((l) => l.text.length > max);
  console.log(`${lines.length} lines → ${outFile} · longest ${Math.max(0, ...lines.map((l) => l.text.length))} characters`);
  if (long.length) console.log(`${long.length} line(s) hold a single word longer than ${max}: ${long.map((l) => `"${l.text}"`).join(", ")}. Set them smaller in the film.`);
}
