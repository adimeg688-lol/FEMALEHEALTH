# Running a film unattended

For a long film nobody is watching. One session on Fable 5.2, on the person's Claude subscription, watched from outside.

## Start it

Prepare the project first: `SCRIPT.md` agreed, the audio final, look references in `ref/`. Then, from anywhere:

```bash
<project>/kit/run-fable.sh <project> "$(cat <project>/PROMPT.txt)"
```

What the launcher does, so you do not have to:

- Removes any `ANTHROPIC_API_KEY` for the run, so it cannot bill API credits.
- Runs `claude -p --model fable --permission-mode acceptEdits --allowedTools 'Read,Write,Edit,Glob,Grep,Bash,Skill' --add-dir <project> --output-format stream-json --verbose`, with the log in `<project>/claude-build.log`.
- Puts one line in front of your prompt telling the session to read this skill's `SKILL.md` first, so it works even where skills are not loaded.
- Refuses to start while another film is running.
- Counts a new line in the log **or** a new file under `out/` as a sign of life. A long capture is quiet in the log but writes frames, and is left alone.
- After 20 minutes with neither and no video, stops the session and resumes **the same session** once: *"You stalled. Read STATE.md and check what exists… render the final video now with `node kit/capture.mjs --resume`… Do not start the film again from scratch."*
- If the session ends without a video, resumes it once. After a second ending without one it stops and prints how many frames and stills exist and the log's last lines.
- At a usage limit it does not loop: it prints the command to resume the same session after the reset.
- At the end it prints the model that was actually used. It should say `claude-fable-5-2`.

`FVM_STALL_MIN=30` changes the patience; `FVM_MODEL` the model.

## What the prompt must say

The session starts with nothing but the prompt and the folder. Say:

1. Use the fable-video-maker skill. Read `SCRIPT.md`, `STATE.md` and the references in `ref/` first.
2. The look, and its hard rules in one line each (the camera, the captions, what must never appear).
3. The audio is final: do not touch `audio/`.
4. Build `film.js` to the contract, run `kit/check.mjs`, run `kit/capture.mjs --stills`, read the contact sheet and the stills, repaint the weakest shots, up to three passes.
5. Whether to stop after the stills and report, or to render when they pass. (Stopping lets a person look before the expensive step.)
6. Update `STATE.md` after every step. End with the short report and the three weakest shots.

A prompt that works:

> Use the fable-video-maker skill. Read SCRIPT.md, STATE.md and everything in ref/. Build this film in the **ink wash** look: rice paper, wet washes, one vermilion accent, mist between five mountain layers, ink-bleed transitions, narrator only, no lip-sync. The audio in audio/ is final; do not touch it. Captions from audio/captions.json, the spoken word in vermilion. Implement film.js to the contract, run kit/check.mjs, then kit/capture.mjs --stills; read out/review/contact.jpg and the stills, repaint the weakest shots, and repeat until every shot is museum-grade or three passes are done. Then render with kit/capture.mjs, run kit/verify.mjs, update STATE.md and print the report with the three weakest shots.

Swap the middle for the look in hand; each look's file ends with its own line to paste.

## By hand

To resume a session yourself (after a usage limit, or to send a correction):

```bash
cd <project> && env -u ANTHROPIC_API_KEY claude -p --resume <session id> --model fable \
  --permission-mode acceptEdits --allowedTools 'Read,Write,Edit,Glob,Grep,Bash' \
  --output-format stream-json --verbose "Carry on from STATE.md." > claude-build-resume.log 2>&1
```

The session id is in the first lines of the log (`"session_id"`).

## Rules for whoever is watching

- One film at a time. Never start a second "just in case".
- At a usage limit, wait for the reset and resume the same session. Do not start a fresh one: it would redo the work.
- A correction after the film is done is a small change: name the shot and the thing, and say "change nothing else".
