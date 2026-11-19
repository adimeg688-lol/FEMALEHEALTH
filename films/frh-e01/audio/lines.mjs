// Caption lines cut by hand at phrase breaks, from audio/words.json. Writes audio/captions.json.
import fs from "node:fs";
const words = JSON.parse(fs.readFileSync(new URL("./words.json", import.meta.url)));
const LINES = ["Do you ever look", "in the mirror and wonder…", "Where did I go?", "Your memory.", "Your confidence.", "Your desire.",
  "Even your body", "feels unfamiliar.", "Menopause could be", "part of the reason.", "Hormone replacement", "therapy, or HRT,",
  "can improve sleep,", "ease hot flashes,", "vaginal dryness", "and menopause-related", "low mood.", "Side effects include",
  "headaches and spotting.", "Some treatments increase", "blood clot or", "breast cancer risk.", "But decades of fear",
  "shouldn’t silence", "today’s conversations.", "Ask your doctor", "whether HRT", "is right for you.", "Menopause doesn’t mean", "losing yourself."];
let k = 0; const out = [];
for (const text of LINES) {
  const n = text.split(" ").length, ws = words.slice(k, k + n); k += n;
  if (ws.map((w) => w.w).join(" ") !== text) throw new Error(`mismatch: ${text} vs ${ws.map((w) => w.w).join(" ")}`);
  out.push({ s: ws[0].s, e: ws[n - 1].e + 0.15, text, words: ws.map(({ w, s, e }) => ({ w, s, e })) });
}
if (k !== words.length) throw new Error("words left over");
out.forEach((l, i) => { const nx = out[i + 1]; if (nx) l.e = +Math.min(l.e, nx.s).toFixed(3); else l.e = +l.e.toFixed(3); });
fs.writeFileSync(new URL("./captions.json", import.meta.url), JSON.stringify(out, null, 1));
console.log(out.map((l) => `${l.s.toFixed(2)}–${l.e.toFixed(2)}  ${l.text}`).join("\n"));
