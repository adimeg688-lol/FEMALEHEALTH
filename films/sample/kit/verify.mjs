#!/usr/bin/env node
/**
 * Checks the finished file, not the project: what a person would have to take on trust.
 *
 *   node kit/verify.mjs out/film.mp4
 *   --duration 30      the length it must have (default: the sound file's, when audio/mix.wav exists)
 *   --size 1080x1920   --fps 30
 *   --lufs -16         the loudness it should have (±1.5), and a true peak no higher than -1 dBTP
 *   --silent           the film has no sound on purpose: skip the loudness check
 *   --black-start      the film starts on black on purpose
 *   --frames 0,3.4,7   pull those seconds out of the FILE into out/review/file-*.jpg, to read
 *
 * It also lists the seconds where the picture jumps: they should be your cuts and hits, nothing else.
 *
 * It cannot hear. It measures loudness and says so.
 */
import fs from "node:fs";
import path from "node:path";
import { args, die, ffmpeg, ffprobe } from "./lib.mjs";

const a = args();
const file = a._[0];
if (!file || !fs.existsSync(file)) die("Give it the video:  node kit/verify.mjs out/film.mp4");
const [W, H] = String(a.size || "1080x1920").split("x").map(Number);
const FPS = +a.fps || 30;
const rows = [];
const say = (level, name, detail) => rows.push({ level, name, detail });

const info = ffprobe(file);
if (!info) die(`ffprobe cannot read ${file}.`);
const v = info.streams.find((s) => s.codec_type === "video");
const au = info.streams.find((s) => s.codec_type === "audio");
const dur = +info.format.duration;
if (!v) die("There is no picture in this file.");

say(v.width === W && v.height === H ? "ok" : "FAIL", "size", `${v.width}x${v.height}${v.width === W && v.height === H ? "" : `, wanted ${W}x${H}`}`);
const [n, d] = String(v.avg_frame_rate || "0/1").split("/").map(Number);
const fps = d ? n / d : 0;
say(Math.abs(fps - FPS) < 0.01 ? "ok" : "FAIL", "frames a second", `${fps.toFixed(2)}${Math.abs(fps - FPS) < 0.01 ? "" : `, wanted ${FPS}`}`);
say(v.codec_name === "h264" && v.pix_fmt === "yuv420p" ? "ok" : "FAIL", "format", `${v.codec_name} ${v.pix_fmt} (phones want h264 yuv420p)`);

let want = a.duration ? +a.duration : NaN;
if (!Number.isFinite(want)) {
  const mix = ["audio/mix.wav", "audio/mix.mp3"].map((f) => path.resolve(f)).find((f) => fs.existsSync(f));
  const mi = mix && ffprobe(mix);
  if (mi) want = +mi.format.duration;
}
if (Number.isFinite(want)) say(Math.abs(dur - want) <= 0.05 ? "ok" : "FAIL", "length", `${dur.toFixed(3)} s${Math.abs(dur - want) <= 0.05 ? "" : `, wanted ${want.toFixed(3)} s`}`);
else say("note", "length", `${dur.toFixed(3)} s (nothing to compare it with: pass --duration)`);

// Starts playing before it has fully downloaded only if the index comes first.
const head = Buffer.alloc(Math.min(fs.statSync(file).size, 4 << 20));
const fd = fs.openSync(file, "r");
fs.readSync(fd, head, 0, head.length, 0);
fs.closeSync(fd);
const moov = head.indexOf("moov"), mdat = head.indexOf("mdat");
say(moov > 0 && (mdat < 0 || moov < mdat) ? "ok" : "FAIL", "fast start", moov > 0 && (mdat < 0 || moov < mdat) ? "the index is at the front" : "the index is at the end: encode with -movflags +faststart");

if (a.silent) say("note", "sound", au ? "has a track, loudness not checked (--silent)" : "no track (--silent)");
else if (!au) say("FAIL", "sound", "no sound track in the file");
else {
  const r = ffmpeg(["-i", file, "-map", "0:a:0", "-af", "ebur128=peak=true", "-f", "null", "-"]);
  const tail = (r.stderr || "").split("Summary:").pop();
  const I = +(/I:\s+(-?[\d.]+) LUFS/.exec(tail) || [])[1];
  const TP = +(/Peak:\s+(-?[\d.]+) dBFS/.exec(tail) || [])[1];
  const target = +a.lufs || -16;
  if (!Number.isFinite(I)) say("FAIL", "loudness", "could not be measured");
  else if (I < -60) say("FAIL", "loudness", `${I} LUFS: the track is silent. If that is meant, pass --silent`);
  else say(Math.abs(I - target) <= 1.5 ? "ok" : "FAIL", "loudness", `${I.toFixed(1)} LUFS${Math.abs(I - target) <= 1.5 ? "" : `, wanted ${target} ± 1.5`} (measured, not listened to)`);
  if (Number.isFinite(TP) && I >= -60) say(TP <= -1 ? "ok" : TP <= -0.3 ? "warn" : "FAIL", "true peak", `${TP.toFixed(1)} dBTP${TP <= -1 ? "" : ", wanted -1 or lower"}`);
}

// Black at the start loses the first second of a feed; a long freeze is a shot with no life.
const vf = ffmpeg(["-i", file, "-map", "0:v:0", "-vf", "blackdetect=d=0.05:pix_th=0.08,freezedetect=n=0.002:d=2.5", "-an", "-f", "null", "-"]);
const log = vf.stderr || "";
const blacks = [...log.matchAll(/black_start:([\d.]+) black_end:([\d.]+)/g)].map((m) => [+m[1], +m[2]]);
const startBlack = blacks.find(([s]) => s < 0.05);
if (startBlack && !a["black-start"]) say("FAIL", "frame 0", `black until ${startBlack[1].toFixed(2)} s: the first frame must be the hook`);
else say("ok", "frame 0", startBlack ? "starts on black, as asked" : "not black");
const midBlack = blacks.filter(([s]) => s >= 0.05);
if (midBlack.length) say("warn", "black frames", midBlack.map(([s, e]) => `${s.toFixed(2)}–${e.toFixed(2)} s`).join(", "));
const starts = [...log.matchAll(/freeze_start: ([\d.]+)/g)].map((m) => +m[1]);
const ends = [...log.matchAll(/freeze_end: ([\d.]+)/g)].map((m) => +m[1]);
const freezes = starts.map((s, i) => [s, ends[i] ?? dur]);
const inFilm = freezes.filter(([s, e]) => e < dur - 0.2);
const atEnd = freezes.find(([, e]) => e >= dur - 0.2);
if (inFilm.length) say("warn", "frozen picture", inFilm.map(([s, e]) => `${s.toFixed(1)}–${e.toFixed(1)} s`).join(", ") + ": nothing moves there");
if (atEnd && atEnd[1] - atEnd[0] > 4) say("warn", "end hold", `still for ${(atEnd[1] - atEnd[0]).toFixed(1)} s: 2 to 3 s is enough, with something small alive`);

// Where the whole picture changes at once. A jump that is not a cut or a hit is a torn or wrong frame.
const sc = ffmpeg(["-i", file, "-map", "0:v:0", "-vf", "select='gt(scene,0.3)',showinfo", "-an", "-f", "null", "-"]);
const jumps = [...(sc.stderr || "").matchAll(/pts_time:([\d.]+)/g)].map((m) => (+m[1]).toFixed(2));
say("note", "the picture jumps", jumps.length ? `at ${jumps.slice(0, 40).join(", ")} s${jumps.length > 40 ? " …" : ""}: these should be your cuts and hits only` : "nowhere (no hard cuts)");

if (a.frames) {
  fs.mkdirSync(path.join("out", "review"), { recursive: true });
  const made = [];
  for (const raw of String(a.frames).split(",")) {
    const t = +raw;
    if (!Number.isFinite(t)) continue;
    const f = path.join("out", "review", `file-${String(t).replace(".", "_")}.jpg`);
    ffmpeg(["-ss", String(Math.max(0, Math.min(t, dur - 0.04))), "-i", file, "-frames:v", "1", "-vf", `scale=${Math.round(v.width / 2)}:-2`, "-q:v", "3", f]);
    if (fs.existsSync(f)) made.push(f);
  }
  say("note", "frames from the file", made.join(", "));
}

const mb = fs.statSync(file).size / 1e6;
say(mb > 95 ? "warn" : "ok", "file size", `${mb.toFixed(1)} MB${mb > 95 ? ": make a smaller copy to send (-crf 20)" : ""}`);

const fails = rows.filter((r) => r.level === "FAIL").length;
const warns = rows.filter((r) => r.level === "warn").length;
for (const r of rows) console.log(`${r.level.padEnd(5)} ${r.name.padEnd(16)} ${r.detail}`);
console.log(`\n${fails ? `${fails} to fix` : "the file is sound"}${warns ? `, ${warns} to look at` : ""}. Not checked here: how it looks and how it sounds.`);
try { fs.mkdirSync("out", { recursive: true }); fs.writeFileSync(path.join("out", "verify.json"), JSON.stringify({ file, rows }, null, 2)); } catch {}
process.exit(fails ? 1 : 0);
