# Lanternroom: handoff for a new Claude session

Paste or attach this at the start of a new session so it has the project context.

## What Lanternroom is
- A personal, phone-first AI character chat app (an alternative to Janitor AI) built for its owner, **Fethurz**. Adult content (vore, scat, sexual sound effects) is a core part of it.
- **Code:** GitHub repo **Fethurz/Lanternroom**. The live site is https://fethurz.github.io/Lanternroom/ (GitHub Pages; pushing to `main` publishes it in 1–2 minutes).
- **Files:**
  - the whole app is one file, `index.html`
  - the installable-app files: `sw.js`, `manifest.webmanifest`, `icons/`
  - built-in sounds in `sounds/jeschke/` and `sounds/extra/` (each with a `manifest.json` and `CREDITS.txt`)
- **Full documentation:** `CLAUDE.md` in the repo has the full architecture, every feature, the storage keys, the sync design, the testing steps and the release history. **Read it first.** It loads automatically when the repo is open.
- **Where it runs:** an Android phone, plus Windows (Opera GX) through a small Electron "Windows program". The owner reinstalls it by running `Install Lanternroom.cmd`; it always loads the live site.
- **Account & sync:** a Supabase project (`lanternroom`, ref `kttzglvsaxvzcbzfwfju`) syncs data across devices.

## The owner's rules (always follow)
- **Never read the owner's chats** (the `c2:` / `chats:` rows in Supabase, or chat contents anywhere) unless the owner gives explicit permission for a specific bot's chat. Bot cards, settings and sound lists are fine to read.
- **Characters are always adults.** Keep the hidden adults-only line in the generator and "adult" in image prompts. Add no other content restrictions.
- **API keys never leave the device.**
- **Every release:**
  1. bump `VERSION`
  2. test in headless Playwright with mocked APIs
  3. run `node --check` on the extracted script
  4. update `CLAUDE.md` (architecture + release history)
  5. commit and push to `main`
- **Talking to the owner:** they're not a programmer. Keep explanations short, simple and non-technical. They like warm replies and pet names (sweetie, hon).
- **Sound work:** build a rating page (an artifact with a database) for the owner, and only build in what they approve.

## Where things stand right now (Oct 14)
- **Live version:** v1.41. Branch `main` is untouched.
- **Unfinished v1.42 work** is on branch **`wip-v1.42`** (pushed, not released).

### Done on `wip-v1.42` (not yet tested end to end)
1. **PC program sounds no longer cut out.**
   - The app counts a focused window as on screen (`away()` = hidden *and* not focused).
   - It wakes the sound engine on focus, page show, any state change, and a 3-second check (`acx()`, `wakeAudio()`).
   - The Electron wrapper now turns off Windows' "covered window" detection and background throttling. The scratch installer was rebuilt; the owner must run the new `Install Lanternroom.cmd` once v1.42 ships, and it has to be sent to them.
2. **Climax sounds end with the climax.**
   - `messNow()` turns activity `mess` into `none` once the latest reply has no active cumming (`CUMMING_NOW`), or into `drip` (soft cum taps) if dripping is still described.
   - New activity `inflate` (cum inflation): stomach gurgle loop plus cum sloshes, muffled from outside and clear from inside.
   - New activity `drip`.
3. **No made-up sounds.**
   - The synth tap sounds, synth backgrounds and activity synth fallbacks are removed; only the heartbeat synth remains.
   - Categories without recordings borrow real ones (`fire` → `spell_fire`, `zap` → lightning/beam, `magic` → heal/wind/ice, `wind` → `spell_wind`/`windup`/`breath`, `zzz` → `breath`).
   - Places still without a recording stay silent: campfire, fireplace, spaceship, quiet indoors.
4. **Climax screen effect:** thick white splats pop onto the chat and slowly drip down (`newSplat`/`drawSplat` in `fxFrame`). White drips (`wdrip`) appear while cum is still dripping.
5. **Ambience Bench, all approved:**
   - 18 sounds built in as `sounds/extra/<type>/ab-*.ogg`. CREDITS: Pixabay creators.
   - New places: `savanna`, `jungle`, `party`, `castle`, `lava`, with labels, prompt text, guesses, fallbacks and screen-effect particles.
   - New activity `lick` with `loop_lick`, plus one new kiss.
   - Built-in total went up by 18.
6. **Belch timing:** the built-in belch loops now have belch times in the manifest (field `b`, e.g. gurgle-calm-belch `[3.36, 16.88]`). `startActivity` fires `voreBurp()` at those moments, burp taps fire it too, and so do replies that describe a burp.
7. **Persona colour:** a colour picker in the persona editor (`persona.color`, default `#6fc3d8`), shown as a dot in the persona list. It will be used for "you" in the vore picture and later graphics.

### The vore picture: still being designed
- **Already wired in on `wip-v1.42` (keep these):**
  - the hidden tag field `| vore: type=oral/anal/cock/breast/unbirth/tail; stage=before/swallowing/inside/digesting/after; digest=0-100; pred=species, sex, size; prey=you, species, sex, size (+ more prey); gain=0-100, belly/hips/chest/all`
  - `parseVore`, `voreState` (guesses from the scene when the tag is missing), the prompt section, `m.vore` on messages
  - a corner card `#voreCard` (tap to shrink to an icon), a section in the PC side panel, and the Settings → Look switch `voreGfx`
  - `voreBurp()`
  - fluid colours: acid `#8fdc6a`, cum `#f6f3ea`, juices `#ff9cc6`, milk `#f3e4bd`
  - pred in the amber accent, prey pale `#ece2d2`, you in the persona colour
- **The drawing style was rejected twice:** first procedural shapes, then restroom-sign pictograms (too segmented and abstract). The current drawing code (`vgBody`, `vgHead`, `voreSVG` …) will be replaced.
- **Owner's decisions:**
  - **Style:** solid flat black-silhouette icons like the owner's reference sheets: smooth, simple, natural shapes. Human signs are fine.
  - **All figures face LEFT** (toward the chat).
  - **Prey size must be 100% true to the story's sizes:** the belly, balls, etc. stretch to fit the real prey. A tiny prey is a speck, marked with a ring, never enlarged.
  - **Inside toggle:** a switch shows or hides the inside (prey and fluid). When off, only the pred's swollen belly, balls, etc. show.
  - **Changing parts are drawn in code:** belly, breasts, butt, balls, cock and weight gain on top of fixed base silhouettes.
  - Weight gain is included.
  - "Except for the chest" meant the treasure-chest mimic in the reference sheets was off. It wasn't about bodies.
  - Other confirmed details: the corner card, the PC side panel, on in every vore scene, stages (before, swallowing, inside/digesting, after), a struggle wobble, belch reactions, several prey, macro/micro, same-size vore, and you as the pred.
- **Next step:** the owner is making base silhouettes on their PC with **ComfyUI + FLUX.2 Klein 4B** (the only model that reliably faced left).
  - Saved as PNGs in `C:\Users\Ethan\Claude\silhouettes` (woman, man, wolf-anthro, cat-anthro, dragon-anthro, rabbit-anthro, wolf, horse, lion, dragon, snake, naga, centaur, bird, shark, slime, mimic).
  - Prompts end with: "flat solid black silhouette pictogram, side view facing left, full body, plain white background, clean smooth edges, no outline, no inner details, no white lines, flat chest, slim flat belly, no genitals, arms relaxed at the sides, one figure only, centered".
  - When they arrive: trace them into clean SVG paths (contour tracing and smoothing), mark anchor points per body (mouth, belly, balls, breasts, womb, vent, tail), and add the changing parts in code. Show the owner a rating page first, then build it in, test and ship v1.42.

### Other notes
- **Rating pages (artifacts, each with a database):**
  - Ambience Bench https://claude.ai/artifact/Ef3bjKcWNxQD3qRoPG5YKY (all approved)
  - sign-style mockups https://claude.ai/artifact/Cpi8kXuNAo2DJAMoSJoiGz (rejected)
  - Other benches are listed in `CLAUDE.md`.
- **Cloud workspace limits:** it can't reach Hugging Face, supabase.co or github.io directly, and has no GPU. GitHub pushes work. A cloud session can't use the owner's screen (computer use only works in a session running on their PC).
- **Owner's ideas for later:** running chat and image models locally on their PC (i9 + RTX 5060 Ti), and replacement lantern artwork.
