# Mentor duo

**Use it for:** a talking series with two recurring characters: one who knows and one who is learning. One idea an episode, 45–65 s, ending on a hold and a hook for the next one. A rich mentor and a nervous intern on a private jet, teaching one money idea at a time, is the pattern that has worked.

**This look assembles pictures. It does not draw the characters in code.** Clean TV-cartoon characters (bold outlines, flat cel colour) need finished illustrations. The person brings them, or makes them with an image tool of their own: a character sheet for each, and a still for every shot.

## What you need from the person

- **Two character designs, locked.** Write them into `SCRIPT.md` in one line each (age, hair, clothes, one prop, the default expression) and never change them inside an episode or across the series.
- **A still for every shot**, at the film's size or larger.
- **For every talking close-up, two stills that differ only in the mouth:** one shut, one open (`s02.jpg` and `s02o.jpg`).

If stills are missing, say which ones and stop. Do not draw substitutes.

## What you do

- Composite the stills into the film: a slow push-in toward the point of interest, a tiny bob while a character talks, a slow breath when they do not.
- **Mouths:** warp the open mouth onto the shut still inside an oval mask with a soft edge, driven by that speaker's track in `audio/mouth.json`: open on voiced frames, shut in the short gaps so it does not buzz. Three states are enough.
- Numbers and labels that belong to the scene (a total on a vault, "+8M") are drawn as part of the shot, in its perspective. They are not captions.

## Captions

**Not the house standard.** Montserrat ExtraBold, **capitals**, white, a black stroke of about 6 px, with the words the episode is about (here: money words) in gold `#FFD640`. About **55 px**, smaller when a line is too wide: at 92 px they took over the frame. At 62.5% of the height. Short groups of about three words. Never over the joke's numbers.

## Sound

Two ElevenLabs voices: a deeper, steadier one for the mentor (`stability` about 0.45, `style` 0.3) and a livelier one for the learner (`stability` 0.35, `style` 0.5). A light, upbeat instrumental ducked under the talk; now and then an effect (cash, a ding, a whoosh, a sting on the punchline). Mix at −16 LUFS.

## Mistakes already made

Captions as big as the first version. Mouths that flutter on every frame. Characters that drift off their design between shots. A new face in the middle of a series. Captions over the numbers.

## To start an unattended run

> Composite the provided character and shot stills into a 1080 × 1920 episode. Two speakers, open and shut mouth warps driven by audio/mouth.json, slow push-ins, a slight bob while talking. Captions: Montserrat ExtraBold capitals, about 55 px, white with the key words in gold, at 62.5% of the height. Do not redesign or redraw the characters. The audio is final.
