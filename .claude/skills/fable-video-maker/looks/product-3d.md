# 3D product demo

**Use it for:** a product or a room built in Three.js: an interactive page a person can turn and change, with a film of it captured from the same code. About 27 s for three objects; about 28 s for a room.

## Two things from one scene

1. **The page:** one self-contained HTML file. Three.js bundled in, no server, no network. A person can orbit, switch finishes, turn lights on.
2. **The film:** the same scene driven by `window.film.seek(t)`. Every camera move, light and part position is a function of `t`. Add `start()` and `stop()` for the page's own "play the demo" button if you like; the capture only uses `seek`.

Hide the page's buttons when the address ends in `#capture`.

## What makes it worth watching

**Come apart and come back together.** The parts separate in space, the camera pulls back, they hold, then they return. It shows that the object is really built, part by part.

A structure that has worked for three objects, 9 s each: the light comes on, the finish changes, the parts come apart from about 4.8 to 6.0 s, hold, and are back together by 8.1 s; a fade through black between objects; the first frame black, the last frame the lit hero. (Run `verify.mjs` with `--black-start`.)

A structure that has worked for a room: 0–2 s the empty shell (walls, floor, windows, light, no furniture); then concept cards and furniture dropping into place one piece at a time; then the dressing; then one slow orbit of the finished room. Hide the walls that stand between the camera and the room, but keep them in the lighting.

- **Original designs.** A lamp that reminds you of a classic is fine; a copy of one is not. No brand on any screen or label.
- **Keep the person's lighting.** If the page lets them choose day or evening, the film uses what they chose instead of forcing its own.
- Materials can be modern here (this is not the low-poly look): soft shadows, a floor that reflects a little, real glass.

## Capture notes

Create the renderer with `preserveDrawingBuffer: true`. Set the pixel ratio to 1 and the canvas to the film's size. Drive mixers with `mixer.setTime(t)`. Wait for every model and texture before `ready` resolves. Check `check.mjs` twice as carefully: anything stepped from the frame before will fail it.

## To start an unattended run

> Build a single self-contained HTML file with Three.js bundled and no network. Expose window.film = { duration, fps, width, height, shots, ready, seek(t) }. The objects must come apart and come back together. Original designs, no brands. Hide the controls when the address ends in #capture.
