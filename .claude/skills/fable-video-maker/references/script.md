# Writing the script

`SCRIPT.md` is the contract. Everything after it follows it, so a weak script makes a well-drawn weak film. Write it from the template in the project, show it to the person, and lock it when they say yes.

## What a short film needs

- **A hook on frame 0.** The first picture is already the film: the subject is there, the look is there, something is at stake or strange. If the film has words, the first line lands inside the first second and is three to seven words.
- **A turn.** Somewhere between 55% and 85% of the way in, the picture changes what it means: the crane folds back into a letter, the lights come back wrong, the master does not draw his sword. Name the second it happens. A film without a turn is a mood, and people swipe moods.
- **A last image.** One frame worth holding for 2–3 seconds. Decide it before you draw anything.
- **It works with the sound off.** Write the shot list first, as pictures. Then read only the "what we see" column: if the story is not there, fix the pictures, not the narration.

## Length and words

| Kind | Length | Words |
|---|---|---|
| A gag that loops | 12–14 s | none, or labels on screen |
| A silent crafted story | 22–32 s | a 3–7 word hook on frame 0 at most |
| A silent fable in a narrated look (ink wash, noir) | 14–20 s | none: four or five shots, one turn |
| A narrated fable or noir | 25–45 s | about 2.3 words a second |
| A talking two-hander | 45–65 s | about 2.5 words a second, short turns |
| A list explainer | 40–47 s | about 3 words a second |

A calm 30 seconds is 65 to 75 words. Count them. Leave 2–3 s after the last word for the end hold.

## The shot list

One row a shot: its id (`s01`, `s02`…), the seconds it starts and ends, what we see (subject, place, light), what moves, what the camera does, and the words spoken over it.

- Each shot is a new composition. Change the size of the subject between neighbours: wide, then close, then a detail.
- Quiet films hold a shot for 2.5 s or more. Explainers can cut every 1.5–3 s.
- Cuts land on the voice or the beat, 0.1–0.3 s before the word that names the new picture. When the sound is final, set the cut times from `words.json`, not by eye.
- Put the look's rules for the camera in the "camera" column, so a later session cannot forget them.

## The palette and the light

Four to six colours with their hex values, and one sentence on how the light changes from the first shot to the last (dusk to night, cold to warm, grey until the turn). A film with a light arc reads as a film; one flat grade reads as a slideshow.

## What to avoid

Copy the pitfalls from the look's file into the script, and add anything the person said they do not want. The script is what an unattended session reads: if it is not written here, it will not be respected.
