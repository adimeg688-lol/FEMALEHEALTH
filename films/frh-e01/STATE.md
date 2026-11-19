# STATE · FRH E01 · Where Did I Go?

- [x] Script: the client's approved pack (ref/pack/) is the contract; SCRIPT.md written from it.
- [x] Voice v1 "Amy" (2 takes) → client did not like it; archived in audio/takes/amy.
- [x] Voice v2 "Imogen" jv41DhCf464zw0TI7I1w (client's pick), eleven_multilingual_v2, 2 takes; take 01 (39.65 s) → audio/FRH_E01_VO_imogen_take01.mp3, placed at 0.4 s in audio/voice.wav. Word times from ElevenLabs Scribe (audio/takes/imogen/scribe-take01.json) → audio/words.json.
- [x] Captions: audio/lines.mjs → audio/captions.json · audio/srt.mjs → out/FRH_E01_subtitles.srt
- [x] Score retimed to the new cuts: score.mjs → audio/music.wav · mix: node kit/mix.mjs --duration 45 --voice audio/voice.wav --music audio/music.wav --music-db -16 → audio/mix.wav (−16 LUFS, −1.5 dBTP). AUDIO FROZEN.
- [x] film.js retimed (cuts 4.7 · 11.0 · 23.45 · 33.95 · end card 41.6). Same-frame check passes, 0.39 s a frame. Stills read.
- [x] Full capture, captioned only → out/FRH_E01_captioned_14M.mp4 (14 Mbps, AAC 320k, 79.7 MB; master in out/master, not in git)
- [x] verify: all ok (1080x1920, 30 fps, 45.0 s, -16.0 LUFS, -1.5 dBTP)
