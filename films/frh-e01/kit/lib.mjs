// Shared by the kit's scripts: arguments, a local server for the film's page, the browser, ffmpeg.
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";

/** `--key value`, `--flag`, and bare words. */
export function args(argv = process.argv.slice(2)) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const k = a.slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith("--")) out[k] = true;
      else { out[k] = next; i++; }
    } else out._.push(a);
  }
  return out;
}

export function die(msg) {
  console.error(`!!  ${msg}`);
  process.exit(1);
}

const TYPES = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8", ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml", ".webp": "image/webp", ".ttf": "font/ttf", ".otf": "font/otf", ".woff": "font/woff", ".woff2": "font/woff2",
  ".wav": "audio/wav", ".mp3": "audio/mpeg", ".m4a": "audio/mp4", ".mp4": "video/mp4", ".glb": "model/gltf-binary", ".wasm": "application/wasm",
};

/**
 * Serves the project folder on 127.0.0.1, so modules, fonts and fetch() work the same in the
 * preview and in the capture (a file:// page blocks all three). Nothing leaves the machine.
 */
export function serve(root, port = 0) {
  const base = path.resolve(root);
  const server = http.createServer((req, res) => {
    let rel = decodeURIComponent((req.url || "/").split("?")[0]);
    if (rel === "/favicon.ico") { res.writeHead(204).end(); return; }
    if (rel.endsWith("/")) rel += "index.html";
    const file = path.join(base, rel);
    if (!file.startsWith(base)) { res.writeHead(403).end(); return; }
    fs.stat(file, (err, st) => {
      if (err || !st.isFile()) { res.writeHead(404).end("not found"); return; }
      const type = TYPES[path.extname(file).toLowerCase()] || "application/octet-stream";
      const range = /^bytes=(\d+)-(\d*)$/.exec(req.headers.range || "");
      if (range) {
        const start = +range[1];
        const end = range[2] ? +range[2] : st.size - 1;
        res.writeHead(206, { "content-type": type, "content-range": `bytes ${start}-${end}/${st.size}`, "accept-ranges": "bytes", "content-length": end - start + 1, "cache-control": "no-store" });
        fs.createReadStream(file, { start, end }).pipe(res);
      } else {
        res.writeHead(200, { "content-type": type, "content-length": st.size, "accept-ranges": "bytes", "cache-control": "no-store" });
        fs.createReadStream(file).pipe(res);
      }
    });
  });
  return new Promise((resolve, reject) => {
    server.on("error", reject);
    server.listen(port, "127.0.0.1", () => resolve({ server, url: `http://127.0.0.1:${server.address().port}`, close: () => new Promise((r) => server.close(r)) }));
  });
}

/**
 * Playwright is installed once, beside the skill's own kit (kit/setup.mjs), and every project
 * borrows it: a project's kit/.home names that folder. A project that has its own copy uses that.
 */
async function playwright() {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const homes = [process.cwd(), here];
  try { homes.push(fs.readFileSync(path.join(here, ".home"), "utf8").trim()); } catch {}
  if (process.env.FVM_KIT_HOME) homes.push(process.env.FVM_KIT_HOME);
  for (const dir of homes) {
    for (const name of ["playwright-core", "playwright"]) {
      try {
        const file = createRequire(path.join(dir, "x.js")).resolve(name);
        const m = await import(pathToFileURL(file).href);
        return m.chromium || m.default.chromium;
      } catch {}
    }
  }
  return null;
}

const FLAGS = ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--disable-gpu-vsync", "--force-color-profile=srgb", "--font-render-hinting=none", "--hide-scrollbars", "--autoplay-policy=no-user-gesture-required"];

/** Every way there is to get a browser, in the order they are tried. Returns [browser, what it is] or [null, why]. */
export async function tryBrowser() {
  const chromium = await playwright();
  if (!chromium) return [null, "Playwright is not set up"];
  const tries = [];
  if (process.env.FVM_CHROME) tries.push(["the browser in FVM_CHROME", { executablePath: process.env.FVM_CHROME }]);
  tries.push(["Playwright's Chromium", {}], ["the Chrome on this computer", { channel: "chrome" }], ["the Edge on this computer", { channel: "msedge" }]);
  let last = "";
  for (const [what, opt] of tries) {
    try { return [await chromium.launch({ headless: true, args: FLAGS, ...opt }), what]; } catch (e) { last = String(e && e.message).split("\n")[0]; }
  }
  return [null, last];
}

/**
 * Chromium, drawn in software so the same machine gives the same pixels twice. Uses Playwright's
 * own browser, and falls back to the Chrome that is installed.
 */
export async function browser() {
  const [b, why] = await tryBrowser();
  if (b) return b;
  die(`No browser to film with (${why}). Run the skill's setup once:  node "${path.join(path.dirname(fileURLToPath(import.meta.url)), "setup.mjs")}"`);
}

/** Opens the film's page and waits until it says it is ready: fonts loaded, plates baked. */
export async function openFilm(b, url, size) {
  const page = await b.newPage({ viewport: size || { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e.message || e)));
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  await page.goto(url, { waitUntil: "load" });
  try {
    await page.waitForFunction(() => window.film && typeof window.film.seek === "function", null, { timeout: 30000 });
  } catch {
    await page.close();
    die(`The page never set window.film.${errors.length ? "\n    Page errors:\n    " + errors.slice(0, 5).join("\n    ") : " Check index.html loads the film's script."}`);
  }
  const info = await page.evaluate(async () => {
    await window.film.ready;
    if (document.fonts && document.fonts.ready) await document.fonts.ready;
    const f = window.film;
    return { duration: +f.duration, fps: +f.fps || 30, width: +f.width || 1080, height: +f.height || 1920, shots: Array.isArray(f.shots) ? f.shots.map((s) => ({ id: String(s.id), start: +s.start, end: +s.end, also: Array.isArray(s.also) ? s.also.map(Number).filter(Number.isFinite) : [] })) : [] };
  });
  if (!(info.duration > 0)) die("window.film.duration must be the film's length in seconds.");
  if (!size || size.width !== info.width || size.height !== info.height) await page.setViewportSize({ width: info.width, height: info.height });
  return { page, info, errors };
}

/** Draws the frame for time t and waits until it is on screen. */
export async function seek(page, t) {
  await page.evaluate(async (time) => {
    await window.film.seek(time);
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  }, t);
}

export function ffmpeg(argv, { quiet = true } = {}) {
  const r = spawnSync("ffmpeg", ["-hide_banner", "-y", ...argv], { encoding: "utf8", maxBuffer: 1 << 28 });
  if (r.error) die("ffmpeg is missing. Install it (macOS: brew install ffmpeg · Windows: winget install ffmpeg · Linux: your package manager) and run this again.");
  if (r.status !== 0 && !quiet) console.error(r.stderr.split("\n").slice(-12).join("\n"));
  return r;
}

export function ffprobe(file) {
  const r = spawnSync("ffprobe", ["-v", "error", "-print_format", "json", "-show_format", "-show_streams", file], { encoding: "utf8" });
  if (r.error) die("ffprobe is missing (it comes with ffmpeg).");
  if (r.status !== 0) return null;
  try { return JSON.parse(r.stdout); } catch { return null; }
}

export function run(cmd, argv, opts = {}) {
  return new Promise((resolve) => {
    const p = spawn(cmd, argv, { stdio: ["ignore", "pipe", "pipe"], ...opts });
    let out = "", err = "";
    p.stdout.on("data", (d) => (out += d));
    p.stderr.on("data", (d) => (err += d));
    p.on("error", (e) => resolve({ status: -1, out, err: String(e) }));
    p.on("close", (status) => resolve({ status, out, err }));
  });
}

export const pad = (n, w = 5) => String(n).padStart(w, "0");
export const sec = (t) => (Math.round(t * 1000) / 1000).toFixed(3).replace(/\.?0+$/, "") || "0";
