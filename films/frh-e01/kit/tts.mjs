#!/usr/bin/env node
/**
 * Speaks the film's lines with ElevenLabs and keeps a time for every word.
 *
 *   node kit/tts.mjs audio/lines.json
 *   --duration 30     pad the voice track to the film's length
 *   --gap 0.3         seconds between lines that have no "start" of their own
 *   --offline         build from the answers already saved in audio/lines/ (no key, no network)
 *
 * audio/lines.json:
 *   { "model": "eleven_multilingual_v2",
 *     "lines": [ { "id": "l01", "speaker": "narrator", "voice": "<voice id>", "text": "…", "start": 0.4,
 *                  "settings": { "stability": 0.45, "similarity_boost": 0.8, "style": 0.3 } } ] }
 *
 * It reads the key from ELEVENLABS_API_KEY and never prints it. A line that has not changed is
 * not bought twice: its answer is kept in audio/lines/<id>.json. It writes:
 *   audio/words.json            every word with its seconds on the film's timeline, and who says it
 *   audio/voice.wav             all the lines on the timeline
 *   audio/voice-<speaker>.wav   one speaker alone (for kit/mouth.mjs)
 */
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { args, die, ffmpeg, ffprobe } from "./lib.mjs";

/** ElevenLabs answers with a time for every character: join them into words. */
export function wordsFrom(alignment, offset = 0, speaker) {
  const ch = alignment.characters, st = alignment.character_start_times_seconds, en = alignment.character_end_times_seconds;
  const out = [];
  let cur = null;
  for (let i = 0; i < ch.length; i++) {
    if (/\s/.test(ch[i])) { if (cur) { out.push(cur); cur = null; } continue; }
    if (!cur) cur = { w: "", s: st[i], e: en[i] };
    cur.w += ch[i];
    cur.e = en[i];
  }
  if (cur) out.push(cur);
  return out.map((w) => ({ w: w.w, s: +(w.s + offset).toFixed(3), e: +(w.e + offset).toFixed(3), ...(speaker ? { speaker } : {}) }));
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname);
if (isMain) {
  const a = args();
  const input = a._[0] || "audio/lines.json";
  if (!fs.existsSync(input)) die(`No lines file at ${input}.`);
  const spec = JSON.parse(fs.readFileSync(input, "utf8"));
  const lines = Array.isArray(spec) ? spec : spec.lines;
  if (!Array.isArray(lines) || !lines.length) die("lines.json needs a list of lines.");
  const model = a.model || spec.model || "eleven_multilingual_v2";
  const dir = path.dirname(input);
  const cache = path.join(dir, "lines");
  fs.mkdirSync(cache, { recursive: true });
  const key = process.env.ELEVENLABS_API_KEY;
  if (!a.offline && !key) die("ELEVENLABS_API_KEY is not set. Set it in your shell (never in a file in the project), or make the film to audio you already have.");
  const gap = a.gap !== undefined ? +a.gap : 0.3;

  const words = [];
  const placed = [];
  let cursor = 0;
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (!l.id || !l.text || (!l.voice && !a.offline)) die(`Line ${i + 1} needs an id, a voice and a text.`);
    const sig = createHash("sha256").update(JSON.stringify([model, l.voice, l.text, l.settings || null])).digest("hex").slice(0, 16);
    const jf = path.join(cache, `${l.id}.json`), mf = path.join(cache, `${l.id}.mp3`);
    let saved = null;
    try { saved = JSON.parse(fs.readFileSync(jf, "utf8")); } catch {}
    if (!(saved && (a.offline || saved.sig === sig) && fs.existsSync(mf))) {
      if (a.offline) die(`--offline, but there is no saved answer for line ${l.id}.`);
      const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(l.voice)}/with-timestamps?output_format=mp3_44100_128`, {
        method: "POST",
        headers: { "xi-api-key": key, "content-type": "application/json" },
        // The lines before and after are sent as context, so the voice carries on like one take.
        body: JSON.stringify({ text: l.text, model_id: model, previous_text: lines[i - 1]?.speaker === l.speaker ? lines[i - 1].text : undefined, next_text: lines[i + 1]?.speaker === l.speaker ? lines[i + 1].text : undefined, voice_settings: l.settings }),
      });
      if (!res.ok) die(`ElevenLabs refused line ${l.id}: ${res.status} ${(await res.text()).slice(0, 300)}`);
      const body = await res.json();
      if (!body.audio_base64 || !body.alignment) die(`ElevenLabs answered line ${l.id} without audio or word times.`);
      fs.writeFileSync(mf, Buffer.from(body.audio_base64, "base64"));
      saved = { sig, alignment: body.alignment };
      fs.writeFileSync(jf, JSON.stringify(saved));
      console.log(`spoken  ${l.id}  (${l.speaker || "voice"})`);
    } else console.log(`kept    ${l.id}  (unchanged)`);
    const len = +(ffprobe(mf)?.format?.duration ?? 0) || saved.alignment.character_end_times_seconds.at(-1);
    const start = Number.isFinite(+l.start) && l.start !== undefined && l.start !== null ? +l.start : cursor;
    if (start < cursor - 0.01) console.log(`  note: ${l.id} starts at ${start} s, before the line before it ends (${cursor.toFixed(2)} s). They overlap.`);
    words.push(...wordsFrom(saved.alignment, start, l.speaker));
    placed.push({ file: mf, start, speaker: l.speaker || "voice", len });
    cursor = Math.max(cursor, start + len) + gap;
  }
  const end = Math.max(...placed.map((p) => p.start + p.len));
  const D = a.duration ? +a.duration : +(end + 2.5).toFixed(2);
  if (a.duration && end > D) die(`The voice runs to ${end.toFixed(2)} s but the film is ${D} s. Cut words or make the film longer.`);
  const build = (items, out) => {
    const inputs = items.flatMap((p) => ["-i", p.file]);
    const g = items.map((p, k) => `[${k}:a]aresample=48000,aformat=sample_fmts=fltp:channel_layouts=mono,adelay=${Math.round(p.start * 1000)}:all=1[a${k}]`);
    g.push(`${items.map((_, k) => `[a${k}]`).join("")}amix=inputs=${items.length}:normalize=0:dropout_transition=0,apad,atrim=0:${D}[o]`);
    const r = ffmpeg([...inputs, "-filter_complex", g.join(";"), "-map", "[o]", "-ar", "48000", "-c:a", "pcm_s16le", out], { quiet: false });
    if (r.status !== 0) die(`ffmpeg could not write ${out}.`);
  };
  build(placed, path.join(dir, "voice.wav"));
  const speakers = [...new Set(placed.map((p) => p.speaker))];
  if (speakers.length > 1) for (const s of speakers) build(placed.filter((p) => p.speaker === s), path.join(dir, `voice-${s}.wav`));
  words.sort((x, y) => x.s - y.s);
  fs.writeFileSync(path.join(dir, "words.json"), JSON.stringify(words, null, 1));
  const rate = words.length / Math.max(0.1, placed.reduce((s, p) => s + p.len, 0));
  console.log(`\n${words.length} words · the voice ends at ${end.toFixed(2)} s · the film is ${D} s · ${rate.toFixed(1)} words a second`);
  console.log(`→ ${path.join(dir, "voice.wav")}, ${path.join(dir, "words.json")}${speakers.length > 1 ? `, one track a speaker (${speakers.join(", ")})` : ""}`);
  console.log(`next:  node kit/captions.mjs ${path.join(dir, "words.json")}`);
}
