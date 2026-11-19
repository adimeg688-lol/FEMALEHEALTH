# STATE · FRH E01 · Where Did I Go?

- [x] Script: the client's approved pack (ref/pack/) is the contract; SCRIPT.md written from it.
- [x] Voice: ElevenLabs "Amy" (eleven_multilingual_v2), 2 takes; take 01 chosen (40.96 s) → audio/FRH_E01_VO_take01.mp3, placed at 0.4 s in audio/voice.wav. Word times from ElevenLabs Scribe → audio/words.json.
- [x] Captions: audio/lines.mjs (hand-cut lines) → audio/captions.json · audio/srt.mjs → out/FRH_E01_subtitles.srt
- [x] Score: score.mjs → audio/music.wav · mix: node kit/mix.mjs --duration 45 --voice audio/voice.wav --music audio/music.wav --music-db -20 → audio/mix.wav (−16 LUFS, −1.5 dBTP). AUDIO FROZEN.
- [x] film.js: same-frame check passes, 0.35 s a frame.
- [x] Stills: pass 1, then one repaint (paper fragments, shard spread, end card). Caption boundaries checked with --at.
- [ ] Full capture (captioned) → out/FRH_E01_captioned.mp4
- [ ] Clean capture (echo '{"captions":false}' > variant.json) → out/FRH_E01_clean.mp4, then rm variant.json
- [ ] verify both
