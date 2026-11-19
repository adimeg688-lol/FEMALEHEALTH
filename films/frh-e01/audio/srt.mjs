// The corrected SRT: the draft's 12 cues and their two-line wording, timed to the recorded voice.
import fs from "node:fs";
const words = JSON.parse(fs.readFileSync(new URL("./words.json", import.meta.url)));
const CUES = [
  ["Do you ever look in the mirror", "and wonder…"], ["Where did I go?"], ["Your memory. Your confidence.", "Your desire."],
  ["Even your body feels unfamiliar."], ["Menopause could be part", "of the reason."], ["Hormone replacement therapy,", "or HRT, can improve sleep,"],
  ["ease hot flashes, vaginal dryness", "and menopause-related low mood."], ["Side effects include", "headaches and spotting."],
  ["Some treatments increase", "blood clot or breast cancer risk."], ["But decades of fear shouldn’t", "silence today’s conversations."],
  ["Ask your doctor whether", "HRT is right for you."], ["Menopause doesn’t mean", "losing yourself."],
];
const ts = (x) => { const ms = Math.round(x * 1000), h = Math.floor(ms / 3600000), m = Math.floor(ms / 60000) % 60, s = Math.floor(ms / 1000) % 60; return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")},${String(ms % 1000).padStart(3, "0")}`; };
let k = 0; const cues = [];
for (const lines of CUES) {
  const n = lines.join(" ").split(" ").length, ws = words.slice(k, k + n); k += n;
  if (ws.map((w) => w.w).join(" ") !== lines.join(" ")) throw new Error("mismatch at " + lines[0]);
  cues.push({ s: ws[0].s, e: ws[n - 1].e + 0.25, lines });
}
if (k !== words.length) throw new Error("words left over");
cues.forEach((c, i) => { if (cues[i + 1]) c.e = Math.min(c.e, cues[i + 1].s - 0.04); });
const srt = cues.map((c, i) => `${i + 1}\n${ts(c.s)} --> ${ts(c.e)}\n${c.lines.join("\n")}\n`).join("\n");
fs.writeFileSync(new URL("../out/FRH_E01_subtitles.srt", import.meta.url), srt);
console.log(srt);
