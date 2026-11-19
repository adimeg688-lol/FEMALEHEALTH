# List explainer

**Use it for:** a numbered list reel ("five things to learn before…"), 40–47 s. A fast, confident voice, one illustration a phrase, one caption word at a time.

**This look assembles pictures. Flat pictures drawn in code are not good enough for it.** The illustrations are provided as finished square images (soft pencil line and light watercolour, thin wobbly outlines, pale muted colours, lots of empty paper). You do not draw, redraw, retouch, recolour or restyle them. Your work is the layout, the timing, the slow push-in, the title, the captions and the sound.

If the pictures are missing, say so and stop.

## Layout (1080 × 1920)

- The whole frame is black.
- **A title bar that never moves:** two centred lines in Poppins or Montserrat ExtraBold, about 54 px, baselines near y = 340 and y = 396. Plain words white `#ffffff`, topic words **yellow `#ffd60a`**, payoff words **red `#e8231f`**.
- **A cream panel** `#f4efe2` from y = 420 to y = 1500: a 1080 × 1080 square.
- Each picture is marked in the script as **FULL** (it fills the square) or **CARD** (about 880 × 880, corners rounded by 28 px, centred on the cream).
- **Nothing is drawn below y = 1500.** No avatar, no watermark.

## Camera and pace

Hard cuts every 1.5–3 s, on the first sound of a word: 18 to 25 pictures in a reel. Inside each picture only a very slow eased push-in (1.00 → 1.04), clipped to the panel or the card, resampled from the full-size image (never scaled up from a small copy). The title and the black never move. Frame 0 already holds the first picture, the title and the first word. The end holds on the last picture with no caption.

## Captions

**One word at a time**, the word being spoken (`node kit/captions.mjs audio/words.json --one`). Poppins ExtraBold, about 44 px, fill `#ffd21f`, **a thick black outline of about 6 px**, no shadow, centred in the picture near y = 980. Nothing during a pause longer than 0.35 s.

## Sound

A slightly hurried voice (about 3 words a second) over a very quiet piano or plucked bed, 14 dB under it. Structure: a hook ("Learn these five…"), then "Number one…" and one or two punchy sentences, five times, then a plain ask ("Save this…").

## Mistakes already made

Drawing your own figures, type or shapes inside the illustrations. A push-in that spills out of the card. A title that animates. Captions in the black band at the bottom. More than one word on screen.

## To start an unattended run

> You will not draw anything. Assemble the reel from the provided illustrations: a black frame, a fixed two-line title (white, yellow, red), a cream square panel, FULL and CARD layouts as SCRIPT.md marks them, one yellow caption word at a time, a slow 1.00 → 1.04 push-in clipped to the picture. Check every picture appears in order and nothing is drawn below y = 1500. The audio is final.
