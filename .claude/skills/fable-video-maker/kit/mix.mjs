#!/usr/bin/env node
/**
 * Builds the film's sound: the voice in front, the music ducked under it, effects on their
 * seconds, at one loudness, exactly as long as the film.
 *
 *   node kit/mix.mjs --duration 30 --voice audio/voice.wav --music audio/music.mp3 --sfx audio/hit.wav@17.0,audio/wind.wav@0
 *   --out audio/mix.wav   the file it writes
 *   --lufs -16            the loudness of the whole mix
 *   --music-db -9         the music's level against its file (default -9 under a voice, 0 with no voice)
 *   --fade 0              seconds of fade at the very end
 *
 * The voice file is read, never changed. Loudness is set in two passes (measure, then one
 * steady gain), so the level does not pump. After this, the audio folder is frozen.
 */
import fs from "node:fs";
import { args, die, ffmpeg } from "./lib.mjs";

const a = args();
const D = +a.duration;
if (!(D > 0)) die("Say how long the film is:  --duration 30");
const voice = a.voice, music = a.music;
const sfx = a.sfx ? String(a.sfx).split(",").map((x) => { const i = x.lastIndexOf("@"); return i < 0 ? [x, 0] : [x.slice(0, i), +x.slice(i + 1)]; }) : [];
for (const f of [voice, music, ...sfx.map((s) => s[0])]) if (f && !fs.existsSync(f)) die(`No file at ${f}.`);
if (!voice && !music && !sfx.length) die("Nothing to mix: give --voice, --music or --sfx.");
const out = a.out || "audio/mix.wav";
const target = +a.lufs || -16;
// Under a voice the music starts 9 dB down. With no voice it is the film's sound: left as it is.
const musicDb = a["music-db"] !== undefined ? +a["music-db"] : voice ? -9 : 0;
const fade = +a.fade || 0;

const inputs = [], graph = [], bus = [];
const add = (f) => { inputs.push("-i", f); return inputs.length / 2 - 1; };
const fmt = "aresample=48000,aformat=sample_fmts=fltp:channel_layouts=stereo";
if (voice) {
  const i = add(voice);
  // Padded to the film's length first: the ducker stops passing music the moment its key input ends.
  graph.push(`[${i}:a]${fmt},apad=whole_dur=${D},asplit=2[v][vkey]`);
  bus.push("[v]");
}
if (music) {
  const i = add(music);
  graph.push(`[${i}:a]${fmt},volume=${musicDb}dB[m0]`);
  // The voice pushes the music down by about 10 dB while it speaks, and lets it back up after.
  if (voice) { graph.push(`[m0][vkey]sidechaincompress=threshold=0.02:ratio=10:attack=15:release=450:makeup=1[m]`); bus.push("[m]"); }
  else bus.push("[m0]");
} else if (voice) graph.push("[vkey]anullsink");
sfx.forEach(([f, at], k) => {
  const i = add(f);
  const ms = Math.max(0, Math.round(at * 1000));
  graph.push(`[${i}:a]${fmt},adelay=${ms}:all=1[s${k}]`);
  bus.push(`[s${k}]`);
});
const end = fade > 0 ? `,afade=t=out:st=${Math.max(0, D - fade)}:d=${fade}` : "";
graph.push(`${bus.join("")}amix=inputs=${bus.length}:normalize=0:dropout_transition=0,apad,atrim=0:${D}${end}[pre]`);

const tmp = out.replace(/\.wav$/, "") + ".pre.wav";
let r = ffmpeg([...inputs, "-filter_complex", graph.join(";"), "-map", "[pre]", "-c:a", "pcm_s24le", "-ar", "48000", tmp], { quiet: false });
if (r.status !== 0) die("ffmpeg could not build the mix.");
r = ffmpeg(["-i", tmp, "-af", `loudnorm=I=${target}:TP=-1.5:LRA=11:print_format=json`, "-f", "null", "-"]);
const j = /\{[\s\S]*\}/.exec((r.stderr || "").slice((r.stderr || "").lastIndexOf("{")));
let m;
try { m = JSON.parse(j[0]); } catch { die("ffmpeg could not measure the loudness."); }
const two = `loudnorm=I=${target}:TP=-1.5:LRA=11:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true`;
r = ffmpeg(["-i", tmp, "-af", `${two},apad,atrim=0:${D}`, "-ar", "48000", "-c:a", "pcm_s16le", out], { quiet: false });
fs.rmSync(tmp, { force: true });
if (r.status !== 0) die("ffmpeg could not write the mix.");
const chk = ffmpeg(["-i", out, "-af", "ebur128=peak=true", "-f", "null", "-"]);
const tail = (chk.stderr || "").split("Summary:").pop();
console.log(`mix → ${out} · ${D} s · ${(/I:\s+(-?[\d.]+) LUFS/.exec(tail) || [])[1]} LUFS · true peak ${(/Peak:\s+(-?[\d.]+) dBFS/.exec(tail) || [])[1]} dBTP (measured, not listened to)`);
console.log("The audio folder is now final: build the picture to it and do not change it again.");
