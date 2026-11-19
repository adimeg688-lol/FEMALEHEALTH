# Low-poly

**Use it for:** gentle, melancholic 3D in the style of a 1990s game console. A night flight of about 45 s with two voices, or a silent story of about 28 s (a traveller plants the last crystal and a dark village lights up: a homecoming, not a checkpoint).

## The picture

Chunky faceted geometry drawn the old way. **Not a modern engine look.**

- **Draw it small and scale it up sharp:** render at about 270 × 480 and scale to 1080 × 1920 with nearest-neighbour (`image-rendering: pixelated`, or draw the small canvas into the big one with smoothing off).
- **The old tells:** vertices snapped to the pixel grid, textures warped in screen space (affine), flat or Gouraud shading, colour reduced to 15 bits with an ordered dither, distance fog, **animation on twos** (hold each pose for two frames), no motion blur, no bloom (a dithered halo around a moon is fine).
- Write the renderer yourself: a small software rasteriser in Canvas, or Three.js with flat materials, vertex colours, a low-resolution render target and a dither pass. No physically based materials, no filtered textures, no specular highlights.
- **Night flight palette:** navy `#0a1030`, ocean `#101c4a`, moon `#f3e3a0`, lantern amber `#ffb347`, slate-blue for the bird.
- **Village palette:** night blues `#1B2A4A`, crystal cyan `#5EF2E0`, window amber `#F0A04B`, a cloak in `#C45C4A`.

**Original characters only.** A fan film you both remember is a reference for the mood, never for the cast. Invent the riders, the creature and the story: an old wanderer and a small amber creature on an ancient heron worked.

## Camera, captions

Slow drifts, on twos like everything else. No HUD, no health bars, no pile-up of blur. Captions: the house standard unless the script says otherwise, kept clear of the moon.

## Sound

Two voices for a talking film (a warm deep one, a softer younger one). A piano-and-strings bed and wing and wind effects written in code, ducked under the voices. Mouths: three states from the mouth tracks. Wing beats and their sound land together.

## Mistakes already made

Copying a reference film's cast. A modern renderer look (smooth textures, shine, blur). Figures too small to read. Wings and wing sounds out of step.

## To start an unattended run

> Build this low-poly film with your own small renderer: affine textures, vertex snap, 15-bit colour with dither, fog, animation on twos, drawn at 270 × 480 and scaled up sharp. Original characters only. Two-voice lip-sync from audio/mouth.json where the script has dialogue. The audio is final.
