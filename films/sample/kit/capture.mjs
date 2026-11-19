#!/usr/bin/env node
/**
 * Captures the film from its page.
 *
 *   node kit/capture.mjs --stills            a still from every shot, a motion score, and the contact sheet
 *   node kit/capture.mjs --at 0,3.2,17       full-size stills at those seconds (cuts, captions, lip-sync)
 *   node kit/capture.mjs                     every frame, then the video with the sound  → out/film.mp4
 *
 *   --workers 4     pages capturing at once (each one bakes its own plates: watch the memory)
 *   --resume        keep the frames already in out/frames and capture only the missing ones
 *   --png           PNG frames instead of JPEG (flat colour and smooth skies band less; slower, bigger)
 *   --crf 16        the video's quality (lower is better and bigger)
 *   --audio path    the sound to put under it (default audio/mix.wav when it exists)
 *   --name film     the file's name in out/
 *   --no-encode     stop after the frames
 *
 * Run it from the project folder: the one with index.html in it.
 */
import fs from "node:fs";
import path from "node:path";
import { args, die, serve, browser, openFilm, seek, ffmpeg, pad, sec } from "./lib.mjs";

const a = args();
const root = path.resolve(a.dir || ".");
if (!fs.existsSync(path.join(root, "index.html"))) die(`No index.html in ${root}. Run this from the film's project folder.`);
const out = path.join(root, "out");
const review = path.join(out, "review");
const framesDir = path.join(out, "frames");

const srv = await serve(root);
const b = await browser();
const url = `${srv.url}/index.html#capture`;
const done = async (code = 0) => { await b.close().catch(() => {}); await srv.close(); process.exit(code); };

try {
  const { page, info, errors } = await openFilm(b, url);
  const { duration, fps, width, height, shots } = info;
  const total = Math.round(duration * fps);
  console.log(`film  ${width}x${height} · ${fps} fps · ${sec(duration)} s · ${total} frames · ${shots.length} shots`);
  if (errors.length) console.log(`page errors (fix these first):\n  ${errors.slice(0, 5).join("\n  ")}`);

  const shot = async (t, file, type = "png") => {
    await seek(page, Math.min(Math.max(t, 0), duration - 1 / fps));
    await page.screenshot({ path: file, type, ...(type === "jpeg" ? { quality: 96 } : {}), clip: { x: 0, y: 0, width, height } });
  };

  // ── Stills at given seconds, full size ────────────────────────────────────
  if (a.at) {
    fs.mkdirSync(review, { recursive: true });
    for (const raw of String(a.at).split(",")) {
      const t = +raw;
      if (!Number.isFinite(t)) continue;
      const file = path.join(review, `at-${sec(t).replace(".", "_")}.png`);
      await shot(t, file);
      console.log(`still ${sec(t)} s → ${path.relative(root, file)}`);
    }
    await done();
  }

  // ── A still from every shot, how much each one moves, and the contact sheet ─
  if (a.stills) {
    // The whole pass before is kept in out/review.prev (sheet, stills, --at stills), so this pass can be
    // compared with it shot by shot. The sample film's stills are not a "pass before" of yours.
    const prev = path.join(out, "review.prev");
    fs.rmSync(prev, { recursive: true, force: true });
    let prevFilm = null;
    try { prevFilm = JSON.parse(fs.readFileSync(path.join(review, "stills.json"), "utf8")); } catch {}
    const sameFilm = prevFilm && prevFilm.duration === duration && JSON.stringify((prevFilm.shots || []).map((s) => s.id)) === JSON.stringify(shots.map((s) => s.id));
    if (sameFilm && fs.existsSync(path.join(review, "contact.jpg"))) fs.renameSync(review, prev);
    fs.rmSync(review, { recursive: true, force: true });
    fs.mkdirSync(path.join(review, "full"), { recursive: true });
    const list = shots.length ? shots : Array.from({ length: Math.max(1, Math.round(duration / 3)) }, (_, i, arr) => ({ id: `t${pad(i + 1, 2)}`, start: (i * duration) / arr.length, end: ((i + 1) * duration) / arr.length }));
    if (!shots.length) console.log("window.film.shots is empty, so the film was cut into equal parts. List the real shots there.");
    const rows = [], extras = [];
    for (const s of list) {
      const mid = (s.start + s.end) / 2;
      const full = path.join(review, "full", `${s.id}.png`);
      const later = path.join(review, "full", `${s.id}.b.png`);
      await shot(mid, full);
      // The same shot 0.4 s later: if the two pictures are the same, nothing in the shot is alive.
      const dt = Math.min(0.4, Math.max(1 / fps, (s.end - s.start) / 2 - 1 / fps));
      await shot(mid + dt, later);
      const r = ffmpeg(["-i", full, "-i", later, "-lavfi", "[0][1]blend=all_mode=difference,signalstats,metadata=print:key=lavfi.signalstats.YAVG:file=-", "-f", "null", "-"]);
      const m = /YAVG=([\d.]+)/.exec(r.stdout || "");
      const motion = m ? +m[1] : NaN;
      fs.rmSync(later, { force: true });
      const small = path.join(review, `${s.id}.jpg`);
      ffmpeg(["-i", full, "-vf", `scale=${Math.round(width / 2)}:-2:flags=lanczos`, "-q:v", "3", small]);
      rows.push({ id: s.id, start: s.start, end: s.end, at: mid, motion, file: path.relative(root, small) });
      // The seconds a shot names in `also`: a hit, a turn, a join. The middle of a shot never shows them.
      for (const t of s.also || []) {
        const name = `${s.id}@${sec(t).replace(".", "_")}`;
        await shot(t, path.join(review, "full", `${name}.png`));
        ffmpeg(["-i", path.join(review, "full", `${name}.png`), "-vf", `scale=${Math.round(width / 2)}:-2:flags=lanczos`, "-q:v", "3", path.join(review, `${name}.jpg`)]);
        extras.push({ id: `${s.id} @ ${sec(t)} s`, file: `${name}.jpg`, after: s.id });
      }
    }
    // Frame 0 and the last frame are judged on their own: the hook and the end hold.
    await shot(0, path.join(review, "full", "_first.png"));
    await shot(duration - 1 / fps, path.join(review, "full", "_last.png"));
    for (const n of ["_first", "_last"]) ffmpeg(["-i", path.join(review, "full", `${n}.png`), "-vf", `scale=${Math.round(width / 2)}:-2:flags=lanczos`, "-q:v", "3", path.join(review, `${n}.jpg`)]);

    // The contact sheet is laid out as a page and photographed, so it needs no font support in ffmpeg.
    const tiles = [{ id: "frame 0", file: "_first.jpg", note: "the hook" }, ...rows.flatMap((r) => [{ id: r.id, file: `${r.id}.jpg`, note: `${sec(r.start)}–${sec(r.end)} s · moves ${Number.isFinite(r.motion) ? r.motion.toFixed(2) : "?"}`, still: Number.isFinite(r.motion) && r.motion < 0.35 }, ...extras.filter((e) => e.after === r.id).map((e) => ({ id: e.id, file: e.file, note: "a second the shot named" }))]), { id: "last frame", file: "_last.jpg", note: "the end hold" }];
    const cols = Math.min(6, Math.max(3, Math.ceil(Math.sqrt(tiles.length * 1.6))));
    const tw = 220;
    const th = Math.round((tw * height) / width);
    const html = `<!doctype html><meta charset="utf-8"><style>body{margin:0;background:#15131c;font:12px/1.3 ui-monospace,Menlo,monospace;color:#e9e6f2}
      .g{display:grid;grid-template-columns:repeat(${cols},${tw}px);gap:14px;padding:16px;width:max-content}
      figure{margin:0}img{display:block;width:${tw}px;height:${th}px;object-fit:cover;border-radius:4px;background:#000}
      figcaption{padding:5px 1px 0}b{display:block;font-size:13px}.s img{outline:3px solid #e5432a}.s span{color:#ff8a70}</style>
      <div class="g">${tiles.map((t) => `<figure class="${t.still ? "s" : ""}"><img src="${srv.url}/out/review/${t.file}"><figcaption><b>${t.id}</b><span>${t.note}${t.still ? " · STILL" : ""}</span></figcaption></figure>`).join("")}</div>`;
    const sheet = await b.newPage({ viewport: { width: 1200, height: 800 } });
    await sheet.setContent(html, { waitUntil: "load" });
    await sheet.evaluate(() => Promise.all([...document.images].map((i) => i.decode().catch(() => {}))));
    const g = sheet.locator(".g");
    await g.screenshot({ path: path.join(review, "contact.jpg"), type: "jpeg", quality: 88 });
    await sheet.close();

    fs.writeFileSync(path.join(review, "stills.json"), JSON.stringify({ width, height, fps, duration, shots: rows }, null, 2));
    console.log("\nshot        seconds          moves   still (half size, for reading)");
    for (const r of rows) console.log(`${r.id.padEnd(11)} ${(sec(r.start) + "–" + sec(r.end)).padEnd(16)} ${(Number.isFinite(r.motion) ? r.motion.toFixed(2) : "?").padEnd(7)} ${r.file}${r.motion < 0.35 ? "   ← nothing moves" : ""}`);
    console.log(`\ncontact sheet → out/review/contact.jpg   ·   frame 0 → out/review/_first.jpg   ·   last → out/review/_last.jpg`);
    if (extras.length) console.log(`also on the sheet: ${extras.map((e) => e.id).join(", ")}`);
    if (fs.existsSync(prev)) console.log("the pass before → out/review.prev/ (same names: compare shot by shot)");
    console.log("full-size stills → out/review/full/");
    console.log("Read the contact sheet, then the stills of the weakest shots.");
    console.log("\"moves\" is the average change in brightness (0–255) between the still and the picture 0.4 s later. It only catches a dead picture (under 0.35): a push-in alone scores well above that, so it cannot tell you a shot has life.");
    await done();
  }

  // ── Every frame, then the video ───────────────────────────────────────────
  const ext = a.png ? "png" : "jpg";
  if (!a.resume) fs.rmSync(framesDir, { recursive: true, force: true });
  fs.mkdirSync(framesDir, { recursive: true });
  const frameFile = (i) => path.join(framesDir, `${pad(i)}.${ext}`);
  const todo = [];
  for (let i = 0; i < total; i++) if (!(a.resume && fs.existsSync(frameFile(i)) && fs.statSync(frameFile(i)).size > 0)) todo.push(i);
  if (a.resume) console.log(`resume: ${total - todo.length} frames kept, ${todo.length} to capture`);

  const workers = Math.max(1, Math.min(+a.workers || 4, 8, todo.length || 1));
  const pages = [page];
  if (workers > 1) console.log(`opening ${workers - 1} more page(s): each bakes its own plates before the first frame`);
  for (let w = 1; w < workers; w++) pages.push((await openFilm(b, url, { width, height })).page);
  let next = 0, made = 0, lastSaid = 0;
  // The clock starts now, with every page ready, so the pace it prints is frames only.
  const started = Date.now();
  await Promise.all(pages.map(async (pg) => {
    for (;;) {
      const k = next++;
      if (k >= todo.length) return;
      const i = todo[k];
      await seek(pg, i / fps);
      const tmp = frameFile(i) + ".part";
      await pg.screenshot({ path: tmp, type: a.png ? "png" : "jpeg", ...(a.png ? {} : { quality: 96 }), clip: { x: 0, y: 0, width, height } });
      fs.renameSync(tmp, frameFile(i));
      made++;
      // A line every few seconds, so a person or a watchdog can see it is alive.
      if (Date.now() - lastSaid > 5000 || made === todo.length) {
        lastSaid = Date.now();
        const per = (Date.now() - started) / made / 1000;
        console.log(`frames ${made}/${todo.length} · one every ${per.toFixed(2)} s${made >= workers * 3 ? ` · about ${Math.ceil(((todo.length - made) * per) / 60)} min left` : ""}`);
      }
    }
  }));
  for (let i = 0; i < total; i++) if (!fs.existsSync(frameFile(i))) die(`Frame ${i} is missing. Run again with --resume.`);
  console.log(`frames done in ${((Date.now() - started) / 1000).toFixed(0)} s → out/frames`);
  if (a["no-encode"]) await done();

  const audio = a.audio ? path.resolve(root, a.audio) : ["audio/mix.wav", "audio/mix.mp3"].map((f) => path.join(root, f)).find((f) => fs.existsSync(f));
  if (a.audio && !fs.existsSync(audio)) die(`No sound file at ${audio}.`);
  const file = path.join(out, `${a.name || "film"}.mp4`);
  const D = sec(duration);
  const enc = ffmpeg([
    "-framerate", String(fps), "-i", path.join(framesDir, `%05d.${ext}`),
    ...(audio ? ["-i", audio] : ["-f", "lavfi", "-i", "anullsrc=channel_layout=stereo:sample_rate=48000"]),
    "-map", "0:v:0", "-map", "1:a:0",
    "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", String(a.crf || 16), "-preset", "medium", "-r", String(fps),
    "-vf", "scale=out_color_matrix=bt709:out_range=tv", "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709",
    // The sound is copied as it is: padded with silence or cut to the film's exact length, nothing else.
    "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-af", `apad,atrim=0:${D}`,
    "-t", D, "-movflags", "+faststart", file,
  ], { quiet: false });
  if (enc.status !== 0) die("ffmpeg could not write the video (its last lines are above).");
  const mb = fs.statSync(file).size / 1e6;
  console.log(`video → ${path.relative(root, file)} · ${mb.toFixed(1)} MB${audio ? "" : " · no sound file found, so the track is silent"}`);
  if (mb > 95) {
    const small = file.replace(/\.mp4$/, "_send.mp4");
    ffmpeg(["-i", file, "-c:v", "libx264", "-crf", "20", "-preset", "medium", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "160k", "-movflags", "+faststart", small]);
    console.log(`a smaller copy to send → ${path.relative(root, small)} · ${(fs.statSync(small).size / 1e6).toFixed(1)} MB`);
  }
  console.log(`now check the file:  node kit/verify.mjs ${path.relative(root, file)}`);
  await done();
} catch (e) {
  console.error(`!!  ${e && e.stack ? e.stack : e}`);
  await done(1);
}
