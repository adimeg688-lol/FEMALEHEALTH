# The Quiet Blade · a whole film, to study

A 16-second ink-wash film made with this skill from one paragraph: a young swordsman climbs to an old master, draws his blade, and sits down beside him. Music only, no captions. It is here to show the techniques, not to be copied: take the brush, not the picture.

- `SCRIPT.md` the contract it was built from
- `film.js` the five shots, the ink-bleed and dry-brush joins, the finish
- `ink.js` the brush: seeded noise, a wet wash (soft edge, pooled pigment, a dark rim, granulation), a dry stroke made of separate hairs, "flying white", mountains that thin into mist, pine boughs, petals, the paper
- `figures.js` the two men as line and wash
- `score.mjs` the score, written in code (plucked string, flute, drone, bell, drum)

Run it:

```bash
node "KIT/new.mjs" quiet-blade --example quiet-blade
cd quiet-blade
node score.mjs
node kit/mix.mjs --duration 16 --music audio/music.wav --sfx audio/wind.wav@0,audio/hit.wav@0
node kit/check.mjs && node kit/capture.mjs --stills
```

Its full capture took about nine minutes with four workers on a laptop.

What is still weak in it, by its own report after three stills passes: the ground's dry strokes read as thin hard lines in the fourth shot; the master's robe is too even a mound; the sleeve before the draw reads as a sail; light is a glow rather than shadow shapes. Nobody listened to the score: its loudness was measured, nothing more.
