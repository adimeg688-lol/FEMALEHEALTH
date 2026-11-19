#!/usr/bin/env node
/**
 * Plays the film in a browser, with its sound, for a person to watch before the render.
 *
 *   node kit/serve.mjs          then open the address it prints (space pauses, arrows step a frame)
 *   --port 4173
 */
import fs from "node:fs";
import path from "node:path";
import { args, die, serve } from "./lib.mjs";

const a = args();
const root = path.resolve(a.dir || ".");
if (!fs.existsSync(path.join(root, "index.html"))) die(`No index.html in ${root}.`);
const s = await serve(root, +a.port || 4173).catch(() => serve(root));
console.log(`the film is playing at ${s.url}/  (Ctrl+C stops it)`);
