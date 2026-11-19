# Sound

Sound is made first and then frozen. The mix's exact length is the film's length, the cuts are set from the words' times, and the captions and mouths are driven by them.

## Which path

| The person has | Do this |
|---|---|
| An ElevenLabs key (`ELEVENLABS_API_KEY` in their shell) | Write `audio/lines.json`, run `node kit/tts.mjs audio/lines.json --duration <D>` |
| Their own finished audio (a voice-over, a song they may use) | Copy it to `audio/`, get word times (below), mix or mux as it is |
| Neither, or they want no voice | Music only, or silent: the pictures and a few on-screen words carry it |

Never write a key into a file, print it, or ask the person to paste it into the chat. If it is not in the environment, tell them to set it in their shell and start again.

## A voice with ElevenLabs

`audio/lines.json`:

```json
{ "model": "eleven_multilingual_v2",
  "lines": [
    { "id": "l01", "speaker": "mira", "voice": "<voice id>", "text": "Are we lost?", "start": 3.2,
      "settings": { "stability": 0.45, "similarity_boost": 0.8, "style": 0.3 } },
    { "id": "l02", "speaker": "corin", "voice": "<voice id>", "text": "Only a little." }
  ] }
```

- `voice` is the id from the person's ElevenLabs voice library. Ask them which voice, or which kind (warm storyteller, gravelly, bright young woman); do not guess an id.
- `start` places a line on the film's timeline. Without it, the line follows the one before after a short gap.
- A line that has not changed is not bought twice: its answer is kept in `audio/lines/`.
- **Try two or three voices on one sentence before a series.** A voice is a casting decision; do not commit a whole film to the first one.
- It writes `audio/voice.wav`, `audio/words.json` (every word with its seconds and its speaker), and one `voice-<speaker>.wav` each when more than one person speaks.
- If the model named here is no longer the best one ElevenLabs offers, pass `--model <id>`. The script needs the `with-timestamps` endpoint, which gives a time for every character.

Settings that have worked: a steady narrator or mentor at `stability` 0.45, `style` 0.3; a livelier, more stylised character at `stability` 0.35, `style` 0.5.

## Audio the person already has

You need a time for every word to light the spoken word. If Whisper is installed (`whisper --help` works):

```bash
whisper audio/voice.wav --model small --word_timestamps True --output_format json --output_dir audio/
node kit/captions.mjs audio/voice.json        # writes audio/words.json and audio/captions.json
```

Read the captions once against the script: fix any word Whisper heard wrong in `words.json`, keeping its times, and run `captions.mjs audio/words.json` again.

Without word times, do not fake them. Use whole-line captions timed to the pauses (`ffmpeg -i audio/voice.wav -af silencedetect=noise=-35dB:d=0.3 -f null -` lists them), with no lit word, and say so in the report.

## Captions and mouths

```bash
node kit/captions.mjs audio/words.json                      # short lines → audio/captions.json   (--one: a word at a time)
node kit/mouth.mjs --duration <D> --words audio/words.json mira=audio/voice-mira.wav corin=audio/voice-corin.wav
```

`mouth.json` holds one number from 0 to 1 for every frame and character. Draw three states from it: shut under 0.12, a small oval up to 0.5, open with a hint of teeth or tongue above. Interpolate between frames; the track is already shut between words.

## Music and effects

- **A track the person gives you**, if it is theirs to use.
- **A track from a music generator they use**, exported at the film's length, instrumental.
- **A score you write in code** when the script asks for one: synthesise it (FM, plucked strings, filtered noise, a soft pad) to a WAV with a script in the project, and effects the same way (wind, rain, a bell, a whoosh, footsteps). Sync hits to the script's seconds.

Give the score an arc: sparse at the start, a hit on the turn, air at the end. In a gag, the music stops or hits on the punchline.

Where it lives: the generator is `score.mjs` in the project's root and it writes its files into `audio/` (`music.wav`, and each effect as its own file that starts at 0 so it can be placed with `@0`). It is seeded, so it writes the same file every run. `examples/quiet-blade/score.mjs` is a whole one: a plucked string, a flute, a drone, a bell, a drum.

You cannot hear it, so check what you can: have the script print the level of every second in dB (the root mean square of that second's samples) and see that it is quiet where the script is quiet, that the hit is on its second, and that nothing clips. Say in the report that this is all that was checked.

## The mix

```bash
node kit/mix.mjs --duration <D> --voice audio/voice.wav --music audio/music.wav --sfx audio/hit.wav@17.0,audio/wind.wav@0
```

The voice stays in front. The music sits about 9 dB down and is pushed a further 10 dB or so while someone speaks. The whole mix is set to −16 LUFS with a true peak under −1.5 dBTP, in two passes so the level does not pump, and cut or padded to the film's exact length. Music shorter than the film simply ends: make it long enough.

The flags: `--out audio/mix.wav`, `--lufs -16`, `--music-db` (the music's level against its own file: −9 under a voice, 0 when there is no voice), `--fade <seconds>` for a fade at the very end.

Music only: leave out `--voice`; the music is then left at its own level and effects sit on top of it. Provided audio that is already a finished mix: do not run it through `mix.mjs`; name it `audio/mix.wav` (or pass `--audio` to the capture) and it is muxed exactly as given.

After the mix: **the audio folder is final.** Set the film's `duration` to the mix's length, set the cuts from `words.json`, and do not touch the sound again.
