# Lanternroom — project brief

Lanternroom is a personal, phone-first AI character chat app (an alternative to Janitor AI) built for its owner, **Fethurz**. It runs entirely in the browser and is published with **GitHub Pages** from this repo.

- Live site: https://fethurz.github.io/Lanternroom/
- **The whole app is one file: `index.html`** (HTML + CSS + JS, no build step, no dependencies besides Google Fonts).
- **Publishing:** commit to `main` → GitHub Pages redeploys in ~1–2 minutes. Phones may cache the old page for a few minutes; the owner checks the version at the bottom of Settings.
- **Bump `VERSION`** (near the top of the script, e.g. `"1.9 · Oct 12"`) with every release so the owner can confirm the update landed.
- The owner uses the app on an Android phone and talks to Claude from the Claude mobile app. Keep explanations short and non-technical; they are not a programmer.

## Owner preferences and conventions
- Mobile first: everything must work at ~390 px wide; tap targets ≥ 34 px.
- Dark, warm look: deep purple-black background, amber accent (`--accent #e8a95b`), fonts Young Serif (display) + Atkinson Hyperlegible (body). The **lantern** is the app's identity.
- Prefers compact layouts, tabs over long scrolling lists, and subtle animation.
- Ships features in batches; test them before pushing (see Testing).
- Adult content is part of the app (vore, scat, sexual sound effects). Build what the owner asks for within Claude's guidelines and say plainly if something can't be done.

## Architecture (sections of the `<script>`, in order)
| Section | What it does |
|---|---|
| Storage | `Store` wrapper over IndexedDB (`lanternroom` db, `kv` store) with localStorage fallback. `get/set/del/keys`. |
| Constants & state | `VERSION`, `DEFAULTS` (settings), `S` (global state), helpers (`uid`, `hash`, `esc`, `fill` for `{{char}}`/`{{user}}`), `fmt()` markdown-lite renderer incl. `[color=..]` tags and brightened named colors (`NAMED`). |
| Images | Pollinations image URLs (`imgURL`), portraits (`portraitURL`, mood-based), world covers (`coverURL`), scene backgrounds (`sceneURL`), `ensureVisual()` (AI-written appearance description per character), `seedPicker()` (pick a look). Art types: human / anthro / feral (`ART`, `artOf`). |
| Model API | `ds()` – OpenAI-compatible chat completions with streaming. Provider is DeepSeek (`https://api.deepseek.com`, model `deepseek-flash`) or a custom OpenAI-compatible endpoint. Thinking mode toggle. Sampling params sent only where supported (see below). `dsJSON()` for JSON replies with fallback parsing. `garbled()` detects word-salad and the caller retries once at lower temperature. `parseTag()` reads the hidden `[[mood: x \| place: y \| focus: z]]` line each reply ends with. |
| Prompt building | `buildPrompt()` – system prompt by kind (character / world narrator / group), scenario, persona, special + global instructions, color/SFX rules, summary, facts, triggered lore; history trimmed to the context budget; last 3 user images sent as `image_url` parts; optional "continue" nudge. Lore: `loreSources`, `loreActive` (always-on, primary/secondary keys with ST selectiveLogic, whole-word, case), `parseLorebook` (Janitor/SillyTavern/Tavern import). |
| Data | `newChat`, chat index (`getIndex`, `touchIndex`, `deleteChat`), `saveChat`, `markRecent`, sample character (Wren). |
| Home | Bot list with tabs All / Recent / Favorites / Hidden, search by name/tag, tag filter chips, bulk "Tag untagged", card ⋯ menu (chats, favorite, hide, edit, delete), chat list sheet (`openChats`). |
| Chat | `openChat`, header stage (avatar ring by mood, scene background), group speaker chips, `renderMsgs` (name label on each message, group messages split into per-speaker bubbles, swipe ‹ › for alternate replies, ⋯ button opens Edit/Delete/Redraw/New version), long-press to copy, `generate()` (streaming, lantern sequence, garble retry, memory upkeep), Continue button. |
| Images from the user | Attach from camera (`capture`) or gallery/files, shrunk to 1280 px JPEG, background captions (`captionImages`) for older images. |
| Memory | Rolling summary (`summarize`) when older text passes `summarizeAt`; facts list (`updateFacts`) every `factsEvery` replies; pinned facts never changed by the AI. |
| Illustrate | AI writes a safe-for-work scene prompt → Pollinations image inserted into chat. |
| Expand & Split | ✦ Expand on creation text boxes (`expandText`, `wireExpand`, with undo). ⇆ Split into listings (`splitListings` → chunks text >9k chars → `splitChunk` asks the AI only for each part's name/type/first words, then slices the user's original text with `findLoose`). |
| Settings | Provider/key/model, model sliders, advanced sliders, personas link, all-chat instructions, SFX color rules, visuals, memory, backup export/restore. |
| Personas, Lorebooks, Editor | Persona manager; shared lorebooks attachable to many bots + import; the character/world/group editor (opening-message tabs, world listing category tabs, group member tabs, tags, special instructions, lore, portrait). |
| Import cards | Tavern/Janitor-style JSON or PNG (`chara`/`ccv3` tEXt chunks), alternate greetings, embedded lorebooks. |
| Lantern | `lanternSVG(cls)` – inline SVG with flame, halo, sparks, smoke. Classes: default flicker, `.out` (blown out), `.relit`, `.seq` (typing loop: sparks → brief catch → gutter out), `.lit` (full glow before a reply is revealed). Used for splash, logo (tap to blow out/relight), typing indicator. |
| Sound effects | Colored `[color=..]` words that look like onomatopoeia (`isSfxText`) get a category (`SFX_RULES` regexes → `sfxCat`), an inline animated icon (`FX_ICON[cat]`, 3 variants, chosen by `hash(text)`), and a tap burst (`burst()` using `FX_MOTION[cat]` and `FX_PART`). Categories: gas, fart (brown gas), bubbles, crack, hit, slash, boom, kiss, beat, liquid, fire, zap, magic, zzz, stomp, wind, wave (fallback), plus adult sets shit, shitbones, cum, cumbub, condom, sex. `sfxPick()` refines the word category by text color (light brown #c9a27e → shit, cream → cum, pink #ff6fae → sex) and by chat context from `sfxCtx(i)` (`VORE` regexes over earlier messages): shit → shitbones once prey has been swallowed, digested and is dead; cum → condom when the message mentions a condom or during cock-vore disposal (remains or dissolved prey); gurgles/sloshes → cumbub when balls are mentioned, during cum inflation, or during cock vore (unless only the stomach is mentioned). These icons use fixed colors and share clip shapes injected once as `#lrfxDefs` (`FX_DEFS`). To add a category: add a regex to `SFX_RULES` (order matters), an array of SVGs to `FX_ICON`, and a motion profile to `FX_MOTION`. |
| Boot & migrations | Loads settings/chars/personas/books/recent, migrates old storage formats (`migrateChats` moves legacy `chat:<cid>:<pid>` keys), seeds the sample character, hides the splash. |

## Storage keys (IndexedDB `kv`)
`settings`, `chars` (array of characters/worlds/groups), `personas`, `activePersona`, `books` (shared lorebooks), `recent` ({charId: timestamp}), `chats:<charId>` (chat index: id, personaId, created, updated, count, preview), `c2:<chatId>` (a chat: messages, summary, summarizedUpTo, facts, mood, place, focus, personaId), `seeded`.

Character object fields: `id, kind ("character"|"world"|"group"), name, appearance, description, scenario, firstMessage, altGreetings[], startPlace, instructions, tags[], lore[], bookIds[], members[] (groups), cast[] (worlds: {name, type: character|group|species|location|concept, details}), artType, artDetected, visual, visualManual, visualSrc, seed, customPortrait, fav, hidden`.

Message fields: `id, role ("user"|"assistant"|"image"), content, alts[], alt, altMeta[], mood, place, focus, cont, greeting, image (data URL), caption, url/prompt (illustrations)`.

## Settings the owner chose
Preloaded from their Janitor setup: temperature **1.65**, max tokens **1000**, context **100.6k tokens**, top K **6**, top P **0.79**, repetition penalty **0**, frequency penalty **0.21**. With DeepSeek: temperature and frequency penalty apply in normal mode; top P only in thinking mode; top K and repetition penalty are not supported (sent only to custom providers). The UI labels this. High temperature can garble DeepSeek replies; `garbled()` + retry mitigates it.

Sound-effect color rules live in `DEFAULTS.sfxRules` (user-editable in Settings → All chats): green for belches/gurgles, brown `#a8875a` for farts, light brown `#c9a27e` for defecation sounds, cream `#f1ebda` for cum and ball/belly sloshing, pink `#ff6fae` for sex sounds, red for damage/combat, others chosen by the model.

## Testing
There is no test suite. Before pushing, run the page in headless Chromium (Playwright is available in Claude's cloud workspace) and mock the APIs:
- route `https://api.deepseek.com/**` to return SSE (`data: {"choices":[{"delta":{"content":"..."}}]}` … `data: [DONE]`) for streaming calls and JSON for the rest;
- abort `https://image.pollinations.ai/**` and `https://fonts.googleapis.com/**` (the workspace can't reach them);
- serve `index.html` from a fake origin (e.g. `http://local/new`) so IndexedDB persists across reloads, which also lets you test migrations by loading an older version first.
Also run `node --check` on the extracted script for syntax errors. The cloud workspace cannot reach DeepSeek or github.io directly; GitHub pushes work.

## Release history
v1.0 initial single-file app → v1.1 send-button fix → v1.2 steadier replies, portrait picker → v1.3 human/anthro/feral types → v1.4 worlds, groups, personas, shared lorebooks, expand/split, model settings → v1.5 lorebook import → v1.6 multiple first messages, version label → v1.7 tags/search, continue, colored SFX, world listing types, split fix, polish → v1.8 chat lists, favorites/hidden, lantern splash/logo/typing, SFX icons and tap bursts, image sending → v1.9 lantern thinking sequence, chunked split, listing/member tabs, compact list, Recent tab, ⋯ message button, 3 icon variants per sound, brown fart gas → v1.10 adult sound sets (shit/bone shit, cum/cum bubbles/condom, sex) chosen by color and chat context; cream and pink color rules.

## Ideas the owner has raised for later
- Sound playback when tapping sound effects, and ambient audio that matches the chat (feasible with the Web Audio API; phones only allow audio after a user tap, and iPhones on silent mute it).
- The owner may send marked-up lantern artwork to replace the current drawing.
- Running chat and image models locally on their PC (i9 + RTX 5060 Ti) later.
