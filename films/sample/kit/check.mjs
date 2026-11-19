#!/usr/bin/env node
/**
 * Two questions before the full capture:
 *   1. Does the same second always give the same picture, whatever was drawn before it?
 *   2. How long does one frame take to draw and photograph?
 *
 *   node kit/check.mjs                 six seconds spread over the film, plus the middle of each shot
 *   node kit/check.mjs --at 3,17,17.5  your own list
 *   --budget 1.5                       seconds a frame may take before it warns
 *
 * It draws the list forwards in one page and backwards in a fresh one, and compares the pixels.
 * A film that fails this cannot be captured by several workers: fix it first.
 */
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { args, die, serve, browser, openFilm, seek, sec } from "./lib.mjs";

const a = args();
const root = path.resolve(a.dir || ".");
if (!fs.existsSync(path.join(root, "index.html"))) die(`No index.html in ${root}.`);
const budget = +a.budget || 1.5;
const srv = await serve(root);
const b = await browser();
const url = `${srv.url}/index.html#capture`;
let code = 0;
try {
  const one = await openFilm(b, url);
  const { duration, fps, width, height, shots } = one.info;
  let times = a.at ? String(a.at).split(",").map(Number).filter(Number.isFinite) : [0, 0.17, 0.37, 0.5, 0.71, 0.93].map((f) => f * duration).concat(shots.slice(0, 12).map((s) => (s.start + s.end) / 2));
  times = [...new Set(times.map((t) => Math.round(Math.min(Math.max(t, 0), duration - 1 / fps) * fps) / fps))].sort((x, y) => x - y);
  const clip = { x: 0, y: 0, width, height };
  // Timed the way the capture works: draw the second, then photograph it. The photograph is where
  // the browser really paints a heavy canvas, so drawing alone would look far faster than it is.
  const grab = async (page, t) => {
    const t0 = performance.now();
    await seek(page, t);
    await page.screenshot({ type: "jpeg", quality: 96, clip });
    const ms = performance.now() - t0;
    const png = await page.screenshot({ type: "png", clip });
    return { hash: createHash("sha256").update(png).digest("hex"), ms };
  };
  // One frame drawn and thrown away first: the first one after loading pays for things no other frame does.
  await grab(one.page, times[times.length - 1]);
  const forward = new Map();
  for (const t of times) forward.set(t, await grab(one.page, t));
  // Once more for the first second, after everything else was drawn in the same page.
  const again = await grab(one.page, times[0]);
  const two = await openFilm(b, url, { width, height });
  await grab(two.page, times[0]);
  const backward = new Map();
  for (const t of [...times].reverse()) backward.set(t, await grab(two.page, t));

  let bad = 0;
  console.log("second     same picture   time to draw");
  for (const t of times) {
    const f = forward.get(t), r = backward.get(t);
    const same = f.hash === r.hash && (t !== times[0] || f.hash === again.hash);
    if (!same) bad++;
    console.log(`${sec(t).padEnd(10)} ${(same ? "yes" : "NO").padEnd(14)} ${(Math.max(f.ms, r.ms) / 1000).toFixed(2)} s`);
  }
  const all = [...forward.values(), ...backward.values()].map((x) => x.ms / 1000).sort((x, y) => x - y);
  const mean = all[Math.floor(all.length / 2)]; // the middle one: a single slow frame should not set the estimate
  const worst = all[all.length - 1];
  const frames = Math.round(duration * fps);
  console.log(`\nsame picture every time: ${bad ? `NO, ${bad} of ${times.length} seconds differ` : "yes"}`);
  // One page alone, frame after frame, would take frames × this. Several pages share the processor: a light
  // film gains from them, a heavy one can even lose. Both have been seen, so the estimate is a range.
  const serial = (frames * mean) / 60;
  const span = (m) => (m < 1 ? `${Math.max(5, Math.round(m * 60))} s` : `${Math.ceil(m)} min`);
  console.log(`a frame takes ${mean.toFixed(2)} s to draw and photograph (the typical one; ${worst.toFixed(2)} s at worst) with one page and nothing else running`);
  console.log(`the full capture of ${frames} frames: somewhere between ${span(serial / 2)} and ${span(serial * 2)}, plus the bake in each page. The capture prints the real pace after its first seconds.`);
  if (bad) { code = 1; console.log("Fix: the picture must depend on t alone. Look for Date.now, performance.now, Math.random without a seed, a simulation stepped from the last frame, or a font or image that loads after `ready`."); }
  if (mean > budget) console.log(`Slow: over ${budget} s a frame. Bake the still parts (paper, skies, washes, plates) once into an offscreen canvas and animate only what moves.`);
  if (one.errors.length) console.log(`page errors:\n  ${one.errors.slice(0, 5).join("\n  ")}`);
} catch (e) {
  console.error(`!!  ${e && e.stack ? e.stack : e}`);
  code = 1;
}
await b.close().catch(() => {});
await srv.close();
process.exit(code);
