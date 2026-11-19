# FEMALEHEALTH · films

This repo makes animated short films in code with the **fable-video-maker** skill, kept at
`.claude/skills/fable-video-maker`. Wherever the skill says `KIT`, use `.claude/skills/fable-video-maker/kit`.

- **Every new session:** the container is fresh, so if `.claude/skills/fable-video-maker/kit/node_modules`
  is missing, run `node .claude/skills/fable-video-maker/kit/setup.mjs` once (about 10 s; it uses the
  pre-installed Chromium).
- **Films go in `films/<name>`.** Start one with `node .claude/skills/fable-video-maker/kit/new.mjs films/<name>`.
  `films/sample` is the six-second test film that proved this setup works.
- Frames and review stills are git-ignored; `SCRIPT.md`, `STATE.md`, the code, `audio/` and `out/film.mp4` are committed.
- For "make a film about…", use the fable-video-maker skill and start at "Starting a film".
