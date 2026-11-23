# Little Lotus — Myanmar reading sounds

Open `index.html`, or serve this directory using `python3 -m http.server 8000`. Microphone access requires localhost or HTTPS. Keep the same origin to access any newer browser-saved recordings.

## Included audio

All 165 active sounds are included from Tricia Lee's native-speaker recordings: 33 basic letters, 54 AA/tone forms, and 78 I-vowel forms. No Wikimedia or synthesized pronunciation is used.

Each sound is a separate WebM/Opus file under `recordings/audio/alphabet/`, `recordings/audio/aa/`, or `recordings/audio/i/`. Filenames use Unicode code points; `recordings/audio-index.json` maps the actual Myanmar text to each file. `recordings/bundled-recordings.js` now contains only a small index. Audio loads on playback, not at startup.

Original backups are preserved as `recordings/myanmar-reading-recordings.json` and `recordings/incoming/myanmar-reading-recordings-new.json`. The merged backup is `recordings/merged-recordings.json`; none of those large backups are loaded by the app. Rebuild the separate clips/index with `python3 scripts/prepare_audio.py recordings/myanmar-reading-recordings.json recordings/incoming/myanmar-reading-recordings-new.json` from this directory. Later backups override matching sounds and preserve sounds absent from the new backup.

WebM/Opus playback support is required. Direct-file playback works in supporting browsers. Use localhost or HTTPS for recording and for exporting a backup, which must fetch the individual clips. An exported backup embeds all currently available clips for portability.

Browser-saved recordings override bundled clips for the same exact syllable. Loading the bundle does not overwrite IndexedDB. Backups export the currently available clips, including newer replacements. Importing a backup explicitly replaces those selected sounds in browser storage.

## Lessons and recording

Sound quiz supports all 33 letters (default), the first five, and 87 vowel/tone forms. Each selected form appears once per round. The pattern quiz offers the consonant's three forms; basic-only letters use different basic-letter distractors. Shared-sound spelling variants are accepted.

Record missing sounds defaults to the AA set and shows only missing clips. Once the complete bundle loads, no recordings are required. Uncheck the missing-only filter to preview or rerecord. Use Record → Stop → preview → Save & next. Download a backup after replacing recordings. Clips are stored on the current browser/device; the app does not upload them.

## Games

Flappy Bird is the second game in the gallery. A written prompt appears above the bird with three numbered sound cards below. Play a card's exact native-speaker recording, then select Choose once playback finishes. The matching sound lifts the bird through one pole; other sounds give a retry. Each round has ten poles, with six simple recorded words, basic letters, AA forms, or I forms as the practice set. Vowel lessons contrast the three forms of a consonant where included; distractors always have distinct sounds. No written answer labels appear on sound cards. All sounds come from the bundled recordings or newer browser replacements. No microphone or speech recognition is used. Navigating away stops audio and animation.

Run `node tests/flappy.test.cjs` for three-card options, playback gating, answer checking, flight, and navigation checks.

Flappy Bird uses one continuous course: cleared poles slide off the left edge while the following poles approach from the right. The bird keeps its height between words and glides into each new gap. Clouds and the ground scroll, and its wing flaps throughout the round. Only Start/Restart resets the course. The next unanswered pole still waits at a safe distance while the player listens.

Games opens a picture gallery with a title and description under each game. Click the Memory match picture to open its practice choices and board. All games returns to the gallery, preserving the current round and checked groups.

The Games tab includes Memory match: flip cards to find six pairs of identical written forms. Check any combination of basic letters (33), AA add-on forms (54, including tall AA), and I-vowel forms (78). Each round includes at least one form from every checked group and plays the exact native-speaker recording on reveal. Shared pronunciation alone does not make a memory pair. Changing the checkboxes clears the board; Start a new round reshuffles it. Lesson exclusions also apply here. Open `index.html#games` to go straight to the game.

Run `node tests/audio.test.cjs` and `node tests/memory.test.cjs` to check audio and game behavior.

## Curriculum scope

ခ ဂ င ဒ ပ ဝ use tall AA (ါ) in these plain-consonant patterns. Other plain consonants use ာ. ဃ ဋ ဌ ဍ ဎ ဠ remain in the basic alphabet but are excluded from every add-on lesson as requested by the user. Future lesson families must use `isIncludedForm`. All 99 original AA-family keys remain accepted in stored recordings and backups for compatibility; excluded forms do not appear in active lessons.

Reference notes: `docs/myanmar-reading-reference.md`. This app is not an official textbook transcription.

## I vowel lesson: ကိ ကီ ကီး
The second vowel lesson contains 78 complete syllables: ိ / ီ / ီး for each of 26 included consonants. Record missing sounds defaults to this new set, skips saved clips, and preserves the 87 bundled sounds. Explore and quiz each have a lesson selector. The new quiz requires recordings for its whole set and keeps the three forms of a consonant as choices. Its sound comparison and feedback preserve vowel family and tone, including the distinction between ကိ, ကီ, and ကီး. New clips remain in browser storage until a backup is exported and bundled; the shipped audio files include all 165 active sounds. Old backups remain accepted.

User curriculum update: exclude ဈိ၊ ဈီ၊ ဈီး from the I-vowel (လုံးကြီးတင်) family only. The active I lesson has 78 forms across 26 bases. Keep ဈ and its AA forms available; retain any existing recordings and backup keys.
