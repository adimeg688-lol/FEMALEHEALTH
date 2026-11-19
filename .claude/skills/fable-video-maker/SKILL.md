---
name: fable-video-maker
description: Makes animated short films entirely in code with Claude Fable 5.2 - no video model, no image model, no stock footage. Writes the script shot by shot, gets the voice with a time for every word (ElevenLabs, or the person's own audio, or music only), draws every frame as a pure function of time in Canvas, WebGL or Three.js, captures stills and reads them, repaints the weakest shots, renders a 1080x1920 30 fps MP4 with captions on the spoken word, and checks the finished file. Thirteen looks (painted landscape, ink wash, talking anime with lip-sync, noir, lamp loop, low-poly, papercraft, chalk, data reel, kinetic type, 3D product demo, mentor duo, list explainer) and a tested kit (capture, same-frame check, contact sheet, mix, captions, mouth tracks, file check, unattended launcher). Use for "make a film", "animated video", "animated short", "animated reel", "video in code", "make a video with Fable", "ink wash video", "painted video", "anime short with voices", "noir short", "explainer reel", "typography promo", "3D product demo video", "/fable-video-maker", a SCRIPT.md to build, or any change to a film it made.
---

# Fable Video Maker

You build the whole film in code. A film here is one web page that can draw any second of itself on demand; the kit photographs every frame of it and writes the video. No video model, no image model, no stock footage. Two looks assemble pictures the person brings (`looks/mentor-duo.md`, `looks/list-explainer.md`); everything else you draw.

This file is the playbook: the order of work, the rules, the contract the film's code must keep, and the bar every film has to clear. Each look has its own recipe in `looks/`. Read only the look you are making.

`KIT` below means the `kit` folder next to this file. Inside a project the same scripts are at `kit/`.

## 1. Before the first film on this computer

1. **Model.** These recipes were built and tuned with Claude Fable 5.2. If you are a different model, say so in one line and tell the person to switch with `/model fable`; carry on only if they ask you to.
2. **Setup, once:** `node "KIT/setup.mjs"`. It checks ffmpeg and gets the browser the films are captured with (it uses the Chrome or Edge already installed; only without one does it download Chromium). Fix any line marked `!!` before going on.

## 2. Starting a film

If the person gave you a finished `SCRIPT.md` or brief, that is the contract: build it and do not invent a new story.

Otherwise ask, in one message, only what you cannot guess (four questions at most):

1. **What is the film about?** One sentence is enough.
2. **Where does it go, and how long?** Default: 9:16 for Reels, TikTok and Shorts, 30 seconds.
3. **Which look?** Offer the three that fit what they said, with your pick first (the table in §9).
4. **What do we hear?** A voice (needs their ElevenLabs key), audio they already have, or music only.

Then:

```bash
node "KIT/new.mjs" <short-name>      # the project folder, with a six-second sample film in it
cd <short-name>
node kit/check.mjs && node kit/capture.mjs --stills   # proves this machine can film, in under a minute
```

Write `SCRIPT.md` from the template in the folder (see `references/script.md` for how to write a film that works with the sound off). **Show the person the logline, the shot list and the words, and wait for their yes.** This is the cheapest moment to change anything: after it, the story is locked.

## 3. The order of work

1. **Script.** `SCRIPT.md`: the logline, palette, shots with their seconds, the words, the sound, what to avoid. Locked once agreed.
2. **Sound first.** The voice with a time for every word, the captions cut from those words, mouth tracks for talking characters, music and effects mixed under the voice. `references/audio.md` has every path. The mix's exact length **is** the film's length. Then the `audio/` folder is frozen.
3. **The scene.** `film.js` keeps the contract in §4. Build shot by shot from the look's recipe.
4. **Same frame twice.** `node kit/check.mjs`. Every listed second must say `yes`, and a frame should take under about 1.5 s. Fix both before anything else: a film that fails cannot be captured.
5. **Stills.** `node kit/capture.mjs --stills`, then **Read `out/review/contact.jpg`**, then the stills of the weakest shots. Judge and repaint as §6 says: the first capture, then at most two repaints. In the same step, look at every cut, hit and caption change at full size with `--at`: the film must be right before the expensive step.
6. **Show it.** Give the person the contact sheet and your list of the weakest shots, and ask: render, or change something? (Running unattended, follow the prompt: render when the stills pass.)
7. **Full capture.** `node kit/capture.mjs` in the background (see §7). It writes `out/film.mp4`.
8. **Check the file.** `node kit/verify.mjs out/film.mp4 --frames 0,<each cut>,<each hit>,<the last second>`. Fix anything marked `FAIL`. Read the frames it pulls out of the file (`out/review/file-*.jpg`): they are the video itself, not the page. The seconds it lists under "the picture jumps" must be your cuts and hits and nothing else.
9. **Report** (§10).

Keep `STATE.md` up to date, one line a step. A session that is resumed reads it first and carries on; it never starts the film again.

## 4. The contract the film's code keeps

```js
window.film = {
  duration: 30,              // seconds, exactly the mix's length
  fps: 30, width: 1080, height: 1920,
  shots: [{ id: "s01", start: 0, end: 3.2 }, { id: "s02", start: 3.2, end: 6, also: [4.1] }, …],
                             // a still is taken from the middle of each, and at every second in `also`
  ready: Promise,            // resolves when fonts are loaded and the still parts are baked
  seek(t) { /* draw the exact frame for second t */ }
};
```

- **`seek(t)` is a pure function of `t`.** No `Date.now()`, no `performance.now()`, no `Math.random()` without a seed. Use a seeded generator (there is one in the sample `film.js`) or closed-form motion: sines, springs solved analytically, noise sampled at `t`.
- **Nothing carries over from the frame before.** Cloth, petals, walk cycles, physics and paint boil must give the same picture whether you arrive at 17.0 from 16.97 or from 3.0. Simulate from a fixed start inside `seek`, or better, write the motion as a formula. The capture runs several pages, each taking its own slice of frames: a film that breaks this comes out torn.
- **Bake what does not move.** Paper grain, skies, washes, painted plates, noise fields: draw them once into offscreen canvases or textures before `ready` resolves. `seek` moves, fades and composites them. This is what keeps a 1080 × 1920 frame under 1.5 s.
- **Fonts and images are loaded before `ready`.** Load fonts with `FontFace` from the project's `fonts/` folder and `await` them; `await img.decode()` for every picture. Nothing comes from the network while filming.
- **The stage is exactly the film's size**, top-left, no scrollbars, no letterbox. The sample `index.html` does this; keep it.
- **One file or several.** `film.js` is loaded as a module and the kit serves the folder, so split a long film as you like (the brush, the figures, the shots) and `import` them.
- **Three.js and WebGL:** set `preserveDrawingBuffer: true`, drive every animation mixer and uniform from `t` (`mixer.setTime(t)`), and render inside `seek`. No `requestAnimationFrame` loop decides the picture.

Open the film for a person with `node kit/serve.mjs`: it plays with its sound, space pauses, the arrows step a frame.

## 5. Standing rules

- **One film at a time.** These runs are long. Never start a second film, or a second unattended run, while one is going.
- **Stay in the project folder.** Do not touch sibling folders.
- **The voice is never altered.** No trim, fade, gain, retiming or re-recording of a voice file once it is final. You may build music and effects *under* it when the script asks for a score; then the mix is frozen too. Provided audio is muxed exactly as given.
- **Original characters and stories.** A film someone points to is a reference for look and structure only. Never copy a character's likeness, a real person's face or voice, another creator's handle or watermark, or a brand's logo, unless the person owns it and supplies it.
- **Sound the person has the right to use.** Their own recordings, a track they licensed, music made for the film. If they hand you a song or a speech, ask once whether it is theirs to use, then follow their answer.
- **Nothing on screen says how it was made.** No Fable, Claude, Anthropic or "AI" on the picture, no title card or watermark, unless the script asks for a brand end card.
- **Captions are short lines.** One line, about 22 characters, two to four words. Never re-wrap a caption file into two lines. When a line's time is over it is gone.
- **A small change is a small change.** When the person asks for a fix, change what they named and nothing near it: not the neighbouring shots, the grade, the timing or the sound.
- **You cannot hear.** Measure the sound (`verify.mjs` does) and say in the report that you did not listen.
- **No full capture before the stills pass.** It is the expensive step. Work on `--stills` and `--at` until the film is right.
- **Keys stay out of files.** Read `ELEVENLABS_API_KEY` from the environment. Never write, print or ask the person to paste a key into the project. Never set an Anthropic API key: the films run on the person's Claude subscription.

## 6. The bar, and how to judge the stills

Every film, whatever the look:

- **Frame 0 is the hook.** Finished, in the look, worth being the thumbnail. No fade from black, no empty title card (a type film that starts mid-word is the one exception, and its script says so).
- **Life in every shot.** Four to seven depth planes, and something moving that is not the camera: cloth, hair, mist, rain, particles, a blink every 2–4 s, breathing. A still picture with a zoom is not a shot.
- **The camera is calm.** Slow eased push-ins by default (scale 1.00 → 1.04–1.08, smoothstep, sub-pixel, never stepping whole pixels). No pans, sway or shake unless the look allows it.
- **Each shot is its own composition**, held long enough to read (2.5 s or more for quiet films; explainers can be faster). Cuts land on the voice or the beat, 0.1–0.3 s before the word that names the new picture.
- **The end holds.** The last 2–3 s are one beautiful frame with something small still alive.
- **Characters read at phone size.** No paper-doll cut-outs, no blob faces, no stick figures unless the look is faceless on purpose. A figure the story depends on is at least 12% of the frame's height, or the shot is a close-up.
- **A finish.** Grain like paint or film (never salt-and-pepper noise), a soft vignette, bloom on lights, haze between far planes.
- **It reads with the sound off.** The pictures carry the hook, the turn and the ending; the words add to them.

**Reading the stills.** `capture.mjs --stills` writes a half-size still for every shot (and for every second a shot lists in `also`), frame 0, the last frame, the contact sheet, and the same stills at full size in `out/review/full/`.

The middle of a shot is not the film. **List every hit, turn and join in the shots' `also`**, or the moments the story depends on (the draw, the fall, the label flipping) are never on the sheet.

Each shot also gets a `moves` number: the average change in brightness, on a scale of 0–255, between its still and the picture 0.4 s later. Under 0.35 the picture is dead and is ringed in red. **It only catches a dead picture.** A push-in alone scores far above 0.35, so a good number does not mean the shot has life: judge that with your eyes, by asking what moves that is not the camera.

For every shot answer five questions, 0 to 2 each:

| | 0 | 2 |
|---|---|---|
| **Subject** | I cannot say what this is in three words at phone size | One clear subject, big enough, framed on purpose |
| **Depth** | One or two flat layers | Four or more planes with haze between them, something in front |
| **Light** | Evenly lit, no source | One source that shapes the subject: rim, shadow, glow |
| **Life** | A dead picture (`moves` under 0.35), or only the camera moves | Secondary motion you could name |
| **Finish** | Flat fills, hard vector edges, banding, a caption on a face | The look's own texture, clean caption clear of the subject |

Repaint the two or three lowest shots, capture the stills again, and compare shot by shot with the pass before (the whole of it is kept in `out/review.prev/`). **Three stills captures at most: the first, and one after each of two repaints.** Stop sooner when no shot is under 7 of 10. Whatever is still weak goes in the report by name.

Expect the first capture to make the look's own listed mistakes: flat figures, slab ground, one texture over everything. That is what the repaints are for. "Light" means what it means in the look: in ink on paper it is where the ink thins and the paper glows, not a cast shadow; the look's file says.

## 7. Capturing

```bash
node kit/capture.mjs --stills           # the stills pass (under a minute; most of it is the bake)
node kit/capture.mjs --at 3.1,3.2,17    # full-size stills at those seconds
node kit/capture.mjs --workers 4        # every frame, then out/film.mp4 with the sound
node kit/capture.mjs --resume           # after an interruption: only the missing frames
```

- `check.mjs` times one page drawing and photographing a frame and gives a wide range for the full capture: several pages share the processor, and a heavy film can run slower with four than the sum suggests (a 16 s ink film that drew a frame in 0.8 s alone took nine minutes). Trust the pace the capture itself prints after its first seconds.
- A full capture can take longer than a command is allowed to run in the foreground. **Run it in the background** and read its output when it ends; it prints a line every few seconds. If it is cut off, `--resume` keeps what is there.
- Each worker bakes its own plates. Four is a safe number; use two if memory is tight.
- `--png` for looks with flat colour or smooth skies (data reel, kinetic type, lamp loop): JPEG frames can band there. Grain in the picture also hides banding.
- The master is `-crf 16`. Over about 95 MB the kit also writes a `-crf 20` copy to send.

## 8. Captions

The house standard, unless the look's file overrides it:

| | 1080 × 1920 |
|---|---|
| Font | Lora SemiBold (`fonts/Lora.ttf`, weight 600) |
| Size | 48 px |
| Fill | warm white `#fff1d6` · **the spoken word** gold `#ffc94d` |
| Edge | 2–3 px `rgba(20,12,4,0.85)` outline, plus a 10–12 px shadow at 45% black. No box, no pill, no band |
| Place | one line, centred, baseline at **y = 1240** (65% of the height) |
| Keep clear | nothing to read below y = 1498 (the bottom 22%) or above y = 192, and 60 px from each side: the apps put their buttons and text there |
| Length | about 22 characters, 2–4 words, broken at commas, stops and pauses |
| Timing | from its first word's start to its last word's end + 0.15 s, or the next line's start, whichever is first. A pause over 0.6 s shows nothing |
| Motion | an optional 0.08–0.12 s fade and rise. Nothing else |

- Draw the line fresh on every frame from the caption file. The spoken word is the one whose `[s, e)` holds `t`.
- **On a pale picture** (paper, snow, a bright sky) flip it: ink fill `#1d1a17` with a soft halo in the paper's colour. Warm white on cream cannot be read.
- Keep captions off faces and off the numbers or objects a shot is about. Move the subject before you move the caption; if you must move the caption, stay inside the clear area.
- `node kit/captions.mjs audio/words.json` cuts the lines; `--one` gives one word at a time.

## 9. The looks

| Look | Use it for | File |
|---|---|---|
| **Painted** | Quiet, sincere films: scripture, sermons, journeys, landscapes. A moving oil painting | `looks/painted.md` |
| **Ink wash** | Short fables told by one narrator. A living brush-and-ink scroll, one accent colour | `looks/ink-wash.md` |
| **Talking anime** | Original characters who speak, with voices and lip-sync. Painterly cel animation | `looks/talking-anime.md` |
| **Noir** | Night-city stories: hard shapes, one light a shot, a red moon. Silent or narrated | `looks/noir.md` |
| **Lamp loop** | 12-second relatable gags that loop: faceless figures, one lamp, a label that flips | `looks/lamp-loop.md` |
| **Low-poly** | Gentle 3D in a 1990s console style: flat facets, dither, movement on twos | `looks/low-poly.md` |
| **Papercraft** | Silent crafted stories in cut paper with soft shadows between the sheets | `looks/papercraft.md` |
| **Chalk** | Silent stories drawn in chalk on a blackboard | `looks/chalk.md` |
| **Data reel** | Calm, credible product and data explainers: a dark dashboard, big numbers | `looks/data-reel.md` |
| **Kinetic type** | Brand and launch promos made of words, hard cuts and texture | `looks/kinetic-type.md` |
| **3D product demo** | A product or room in Three.js that comes apart and back together, as a film or a page | `looks/product-3d.md` |
| **Mentor duo** | A two-character talking series. *Assembles illustrations the person brings* | `looks/mentor-duo.md` |
| **List explainer** | "Five things…" reels, one picture a phrase. *Assembles illustrations the person brings* | `looks/list-explainer.md` |

A whole film made with this skill is in `examples/quiet-blade/` (ink wash, 16 s, music only), with its script, its brush library and its score. `node "KIT/new.mjs" <name> --example quiet-blade` opens it as a project. Read it for technique when a look asks for something you have not built before.

A look is a recipe, not a filter: its palette, what the camera may do, how the caption is set, what must be alive in every shot, and the mistakes that have already been made in it. If the person wants a look that is not here, build it the same way: write those five things down in `SCRIPT.md` first.

## 10. Finishing

Run through this before you say the film is done:

- [ ] `verify.mjs` has no `FAIL`: size, 30 fps, h264 yuv420p, the exact length, sound present, about −16 LUFS, true peak −1 dBTP or lower, fast start, frame 0 not black.
- [ ] The contact sheet was read after the last change, and the weakest shots were fixed or are named in the report.
- [ ] `check.mjs` says the same picture every time.
- [ ] Captions: the look's font and colours, the spoken word lit, nothing left behind at a line's end (capture `--at` just before and after two or three boundaries and read them), nothing in the covered areas.
- [ ] Talking films: mouths follow the mouth tracks, shut between words, no buzzing.
- [ ] Nothing on screen that the rules forbid for this look, and nothing about how the film was made.
- [ ] A small-change request changed only what was named.

**The report**, short and plain:

- The file: path, size in pixels, fps, length, megabytes (and the smaller copy, if one was made).
- One line of story, and what each shot shows if that helps.
- Time to draw a frame, and that the same-frame check passed.
- **The three to five weakest shots**, by id, and why.
- **What you could not check**: that you did not listen to the sound, and anything else you took on trust.
- How to watch it: the file, and `node kit/serve.mjs` for the live page.

Do not oversell it. Then stop: do not start another film unless asked.

## 11. Running unattended

For a long film nobody is watching, `kit/run-fable.sh` starts one session on Fable 5.2 with the person's subscription, watches it, and resumes the same session once if it goes quiet for 20 minutes. `references/headless.md` has the command, what the prompt must say, and what to do at a usage limit.
