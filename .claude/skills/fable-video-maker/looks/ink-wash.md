# Ink wash

**Use it for:** short original fables: a young swordsman, an old master, a quiet turn. **One storyteller narrates. Characters never speak and never lip-sync.** 26 s has worked best; up to about 60.

**Without a voice** it works too: music only, no captions, 14–20 s, and the pictures carry all of it. Then every shot needs its meaning in the staging (who faces whom, what is drawn, what is put down).

## The picture

A living museum-grade brush painting on a scroll. Not a hatched paper doll on a beige background.

- **Paper:** rice-paper cream `#efe6d2` with visible fibres and a slight vignette, baked once.
- **Ink:** from `#0f0d0b` through six to eight warm grey washes, with wet edges, darker rims where a wash dried, granulation, dry-brush streaks that split like hair, tapered ends.
- **One accent colour, and only one** (usually vermilion `#c8361f`): the sun's disc, a sash, petals, the seal, the spoken word. Nothing else is coloured.
- **Depth:** five or more mountain layers dissolving into mist, bands of mist moved by flow noise, cherry petals at three depths that tumble and blur with distance.
- **Figures** are elegant ink silhouettes with real anatomy and something that moves: hair, sleeves, a sash (a spring, or sine cloth written as a formula). The master is almost still: only cloth and hair move.
- **The seal:** a square vermilion stamp with an abstract carved pattern can land at the opening and on the end hold. **No real characters or letters in it, or anywhere in the painting.**

## How to get it in Canvas

A worked film in this look is in `examples/quiet-blade/`; `ink.js` there has each of these as a function. In short:

- **Nothing is a clean shape.** Run every outline through seeded noise, and draw curves through points (a spline), never corners. Rock gets small broken steps along each straight run.
- **A wet wash:** fill the shape into a spare canvas with a 1–2 px blur for the soft edge; inside it (`source-atop`) add a dozen large soft pools, some darker and some paper-coloured; stroke the same outline, blurred, for the dark rim where it dried; then cut the paper's grain out of it (`destination-out` with a noise pattern) so pigment sits in the paper's tooth. Draw the result at 60–75%.
- **A dry stroke:** not one line but many hairs side by side, each with its own load of ink, each skipping wherever a noise value falls under a threshold that rises along the stroke. Width follows a pressure curve: thin in, full, thin out.
- **Flying white:** the same dry stroke drawn with `destination-out` over wet ink, so the paper shows through.
- **A mountain:** ink at the crest, thinning to nothing in the mist below (a gradient mask), never a filled silhouette to the bottom of the frame.
- **Ground:** a pale wash that dies away below its edge, and a few long dry strokes. Never a slab.
- **An ink-bleed join:** bake one noise field; reveal the next shot wherever `distance from the bleed's centre + noise` is under a threshold that grows with time, with a soft dark fringe at the front.
- **Light,** in ink: the paper glows round the sun, ink thins toward it, and a backlit shoulder keeps a sliver of bare paper. There are no cast shadows.
- **Figures** are line and wash: a pale wash for the mass, a contour that swells and thins like a pressed brush, a few dry strokes for folds. A filled black doll is the mistake.

## Transitions and camera

Shots are joined by an ink bleed or a dry-brush wipe. Never a plain crossfade. The camera makes slow push-ins and gentle crane-ups, with parallax from the push. **Exactly one fast punch-in** if the script has a hit in the music (a drum at a named second), with a brief splash of ink. No shake.

## Captions

The house layout and Lora, with **the spoken word in vermilion** `#e0472b`. On the pale paper use the ink fill `#1d1a17` with a paper-coloured halo; warm white only over dark ink. 46 px with the baseline at y = 1270 has worked; it is still above the covered area.

## Sound

Narrator only: a warm, unhurried storyteller. A sparse score (bamboo flute, plucked zither, a deep drum) or a quiet bed, plus wind, a bell, a whoosh. Duck the music hard under the voice. Tie the big pictures to the mix: the gust, the drum, the temple bell.

## Mistakes already made

Flat paper-doll warriors. Scan-line or blocky texture where paper grain should be. Ground as a slab. Boughs across a face or a blade. One static layer. A single push-in and nothing else. Letters or characters in the painting. A second accent colour. Lip-sync (there is none). Plain crossfades. Blood: violence is implied in ink, never shown.

## To start an unattended run

> Build this film as a living ink-wash scroll: rice paper, wet washes, one vermilion accent, mist between five mountain layers, ink-bleed transitions, narrator only, no lip-sync. Captions in Lora with the spoken word in vermilion. Every shot museum-grade before any render. The audio is final.
