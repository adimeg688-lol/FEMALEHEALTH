# Kinetic type

**Use it for:** a brand or launch promo made of words: an 18 s typography essay, a 38 s motion-graphics promo. 16:9 (1920 × 1080) or 9:16. Music and effects, no voice unless asked.

## The picture

- **The brand's own palette and mark, exactly.** Three colours are enough: a ground, an ink, one loud colour. A palette that has worked: cream `#F2EDE4`, coral `#D97757`, ink `#141414`.
- **Short stacked lines**, often lowercase. One serif italic word as the hero of a frame (Instrument Serif), a grotesque for everything else (Manrope or Inter).
- **Furniture:** small HUD boxes, dashed tracks a shape travels along, a dotted landscape, cards that stretch like elastic, a typing cursor.
- **Hard cuts and texture wipes. Almost no dissolves.** Type lands on the beat.

## What it may say

**Only the copy the person approved.** No invented statistics, no prices they did not give, no claims. Put the locked copy in `SCRIPT.md` and set type from it, not from memory.

A type film is the one kind that may start in the middle of a word or on black, if the script says so. Run `verify.mjs` with `--black-start` then.

## Camera, captions

There is no camera; the type moves. No captions: the film is the words. Keep the words inside the clear area on a vertical film.

Use `--png` for the capture: flat colour bands in JPEG. Pass `--size 1920x1080` to `verify.mjs` for a wide film, and set `width` and `height` on `window.film`.

## To start an unattended run

> Build this typography promo. Locked copy only, from SCRIPT.md. The brand's ground, ink and one loud colour; short stacked lines, one serif italic hero word, hard cuts, texture wipes, no dissolves, no invented numbers. Capture with --png.
