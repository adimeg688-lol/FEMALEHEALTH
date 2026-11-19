#!/usr/bin/env node
/**
 * One-time setup, beside the skill: the browser the films are captured with.
 *
 *   node setup.mjs
 *
 * It installs Playwright's small driver here (about 10 MB, no browser) and uses the Chrome or
 * Edge already on the computer. Only when there is none does it download Chromium (about
 * 150 MB, once). It checks ffmpeg too. Nothing is installed system-wide.
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { tryBrowser } from "./lib.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const npx = process.platform === "win32" ? "npx.cmd" : "npx";
let bad = 0;

const ff = spawnSync("ffmpeg", ["-version"], { encoding: "utf8" });
const fp = spawnSync("ffprobe", ["-version"], { encoding: "utf8" });
if (ff.error || fp.error) { bad++; console.log("!!   ffmpeg is missing. Install it, then run this again:  macOS: brew install ffmpeg · Windows: winget install ffmpeg · Linux: sudo apt install ffmpeg"); }
else console.log(`  ok   ${ff.stdout.split("\n")[0].split(" Copyright")[0]}`);

if (!fs.existsSync(path.join(here, "package.json"))) fs.writeFileSync(path.join(here, "package.json"), JSON.stringify({ name: "fable-video-maker-kit", private: true, type: "module" }, null, 2));
if (!fs.existsSync(path.join(here, "node_modules", "playwright-core"))) {
  console.log("  ..   installing the driver for the browser (about 10 MB)");
  const r = spawnSync(npm, ["install", "playwright-core", "--no-audit", "--no-fund", "--loglevel", "error"], { cwd: here, encoding: "utf8", shell: process.platform === "win32" });
  if (r.status !== 0) { bad++; console.log(`!!   npm could not install playwright-core:\n${(r.stderr || "").split("\n").slice(-4).join("\n")}`); }
}
if (fs.existsSync(path.join(here, "node_modules", "playwright-core"))) {
  let [b, what] = await tryBrowser();
  if (!b) {
    console.log("  ..   no Chrome or Edge found: downloading Chromium once (about 150 MB)");
    const r = spawnSync(npx, ["playwright-core", "install", "chromium"], { cwd: here, stdio: "inherit", shell: process.platform === "win32" });
    if (r.status === 0) [b, what] = await tryBrowser();
  }
  if (b) {
    const page = await b.newPage({ viewport: { width: 270, height: 480 } });
    await page.setContent('<canvas id="c" width="270" height="480"></canvas><script>const g=document.getElementById("c").getContext("webgl");window.gl=!!g</script>');
    const gl = await page.evaluate(() => window.gl);
    await b.close();
    console.log(`  ok   films are captured with ${what}${gl ? "" : " (no WebGL here: 2D canvas films only)"}`);
  } else { bad++; console.log(`!!   no browser could be started: ${what}`); }
}
console.log(bad ? "\nFix the lines marked !! and run this again." : "\nReady. Start a film with:  node new.mjs <folder>");
process.exit(bad ? 1 : 0);
