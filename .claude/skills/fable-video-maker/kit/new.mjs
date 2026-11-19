#!/usr/bin/env node
/**
 * Starts a film's project folder: the page, the sample film to replace, the caption font, the kit.
 *
 *   node new.mjs my-film            (run with the kit's full path, from where the films are kept)
 *   node new.mjs qb --example quiet-blade      start from a worked example instead of the sample
 *
 * The folder it makes:
 *   SCRIPT.md     the contract: what the film is, shot by shot
 *   STATE.md      where the work stands, so a resumed session knows
 *   index.html    the stage, exactly the film's size
 *   film.js       the film: window.film = { duration, fps, width, height, shots, ready, seek(t) }
 *   audio/        the voice, the words and their times, the mix (frozen once the picture starts)
 *   fonts/        the caption font
 *   kit/          the scripts: capture, check, verify, captions, mouth, mix, tts, serve, run-fable.sh
 *   out/          stills, the contact sheet, frames, the video
 *   ref/          look references, and earlier versions to beat
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const name = process.argv[2];
if (!name || name.startsWith("--")) { console.error("Name the folder:  node new.mjs my-film   (--example quiet-blade starts from the worked example)"); process.exit(1); }
const ex = process.argv.indexOf("--example") > 0 ? process.argv[process.argv.indexOf("--example") + 1] : null;
const exDir = ex ? path.join(here, "..", "examples", ex) : null;
if (ex && !fs.existsSync(path.join(exDir, "film.js"))) { console.error(`!!  No example called "${ex}". There is: ${fs.readdirSync(path.join(here, "..", "examples")).join(", ")}`); process.exit(1); }
const dest = path.resolve(name);
if (fs.existsSync(dest) && fs.readdirSync(dest).length) { console.error(`!!  ${dest} already exists and is not empty. Pick another name: nothing was touched.`); process.exit(1); }
for (const d of ["audio", "out", "ref", "kit"]) fs.mkdirSync(path.join(dest, d), { recursive: true });
fs.cpSync(path.join(here, "template"), dest, { recursive: true });
for (const f of fs.readdirSync(here)) if (/\.(mjs|sh)$/.test(f) && !["new.mjs", "setup.mjs"].includes(f)) fs.copyFileSync(path.join(here, f), path.join(dest, "kit", f));
try { fs.chmodSync(path.join(dest, "kit", "run-fable.sh"), 0o755); } catch {}
// A worked example replaces the sample film: its script, its code, its score.
if (exDir) for (const f of fs.readdirSync(exDir)) fs.cpSync(path.join(exDir, f), path.join(dest, f), { recursive: true });
// The project borrows the browser driver that setup.mjs installed beside the skill.
fs.writeFileSync(path.join(dest, "kit", ".home"), here);
console.log(`project → ${dest}`);
if (exDir) console.log(`It holds the worked example "${ex}". Its README.md says how to run it.`);
else {
  console.log("It holds a six-second sample film. Prove the machine works before writing yours:");
  console.log(`  cd "${dest}"`);
  console.log("  node kit/check.mjs && node kit/capture.mjs --stills");
  console.log("Then write SCRIPT.md and replace film.js.");
}
