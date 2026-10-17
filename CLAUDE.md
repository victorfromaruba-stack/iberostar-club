# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A guest-facing web app for the Iberostar Aruba resort ("club" portfolio of hotels, restaurants,
spa, golf, activities, and retail partners). It's a mobile-first PWA-style directory: browse by
category, view a detail modal with a photo gallery/lightbox, view PDFs/videos, and share items.
There is no backend — everything is static HTML/CSS/JS plus a local media library.

## Repository structure

- `index.html` — guest-facing markup only. Links `css/styles.css` and loads
  `js/image-utils.js` → `js/data.js` → `js/app.js` (in that order, all `defer`).
- `admin.html` — separate, unlinked staff page for editing content. Password-gated (see
  Admin panel below). Loads `css/styles.css`, `js/data.js`, `js/admin.js`.
- `qr.html` — standalone, printable "scan to save" page: a QR code (inline SVG, pre-generated
  for `https://victorfromaruba-stack.github.io/iberostar-club/` — regenerate the path data if the
  URL changes) plus iPhone/Android Add-to-Home-Screen steps. `manifest.webmanifest` (linked from
  `index.html`) makes the Android install use the proper name/icon/standalone mode.
- `css/styles.css` — all styling for both pages (glassmorphism cards, modal, lightbox, nav,
  ambient day/night decorations, admin form styles).
- `js/data.js` — the entire content catalog (`defaultData`). This is the file you edit to add,
  remove, or fix a hotel/restaurant/activity/etc.
- `js/image-utils.js` — device-class detection (adds `device-ios`/`device-mobile`/etc. to
  `<html>`) and the broken-image fallback chain (`handleImgError`/`handleImgLoad`).
- `js/app.js` — guest app: rendering (`renderApp`, `openDetails`), search (`filterContent`),
  lightbox, sharing, time-of-day theming, in-house-mode toggle.
- `js/admin.js` — staff-only CRUD over the catalog, the offline-cache tool, and the password
  gate. Not loaded by `index.html`.
- `assets/` — all media (jpg/png/pdf/mp4), in per-category subfolders: `Hotels/`, `Restaurants/`,
  `Spa/`, `Golf/`, `Activities/`, `Logos/`, each with per-property subfolders below that.
  `assets/fonts/` holds the self-hosted Inter/Playfair Display woff2 files (see Fonts below).
- `academy/` — **staff-only**, unlinked from the guest app (like `admin.html`): "Show-Up Academy",
  a Duolingo-style training game for OPCs on guest qualifications, the Open House invitation
  pitch, NLP (rapport, wording, reading guests) and street skills (stopping people, small talk,
  objections: ideas from the Timeshare OPC University videos and the OPC Secrets By Suz audiobook, in our
  own words and credited with links in each guidebook), plus Street practice, a role-play with an AI
  tourist couple that Shoco scores afterwards. Served at `https://victorfromaruba-stack.github.io/iberostar-club/academy/`. It shares
  nothing with the guest app. **`academy/index.html` is built; don't edit it by hand.** The source
  is `academy/src/`: `levels.js` and `content-pre.js` (lessons and units; the writing rules for
  questions are at the top of `levels.js`. **Adding a level is a three-file change**: the level
  itself, its unit in `content-pre.js`, and both `ORDER` and `LEVEL_IDS` in `app.js` — a level in
  one and not the other crashed the manager panel on 2026-10-17 and silently locked the Final.
  `lint_content.js` now fails the build on it), `content-post.js` (`MAP_STEPS`, the Script tab's lines
  `SCRIPT`, the couple generator), `app.js` (engine), `street-core.js` (Street practice's couples, rules and prompts, shared with the Edge Function), `street.js` (the Street practice screens), `team.js` (the manager panel), `boot.js`
  (start-up), `style.css`, `icons.js`, `mascot.js` (Shoco, the burrowing owl), and `clips.json` (the
  nine voice notes, transcribed with timings). Rebuild
  with `python3 academy/src/build.py --page`; the build fails if a Script line doesn't match the
  words in the voice note it plays, and `lint_content.js` fails it on content errors (repeated ids,
  bad voice-note ranges, a "Word for word" answer that isn't in its recording, a/an and other
  grammar slips, including in 300 generated guest cards) and whenever answer length would give
  the right option away (it may not be the longest by more than 5 characters, and may be the
  longest option in at most 35% of questions). Test with
  `node academy/src/e2e.js <url> <outdir>` and `node academy/src/street_e2e.js <url> <outdir>`, `node academy/src/ear_e2e.js <url> <outdir>`, `node academy/src/live_e2e.js <url> <outdir>` and `node academy/src/gauntlet_e2e.js <url>` (the Gauntlet's lives/score loop), `node academy/src/board_e2e.js <url>` (the team board), `node academy/src/panel_e2e.js <url>` (the manager panel against old-shape rows) and `node academy/src/account_e2e.js <url>` (getting your progress back on a new phone) (Playwright; serve `academy/`
  with Range support, e.g. `npx http-server academy`, and use a `localhost` url). Media: `academy/audio/` (voice notes, MP3), `academy/img/` (two slides
  from the Open House pitch deck, `photos/`), `academy/video/` (golf loop, H.264 MP4). It has `noindex`. Progress lives in
  `localStorage['showup.v1']` and is mirrored to Supabase project `cdkopyphjvfxjqhasrae` once a
  worker saves a name (tables `sua_people` and `sua_config`, closed to the public key and reachable
  only through `sua_save`, `sua_team`, `sua_hide`, `sua_set_code`, `sua_board`, `sua_claim` and
  `sua_set_pin`; the key in the page is a publishable key).
  **Accounts (2026-10-17):** a worker is a name plus a four digit code, not a phone. `sua_set_pin`
  stores `pin_hash` on their row; on a new phone `sua_claim` verifies name+code, repoints
  `device_id`/`secret_hash` at that phone (killing the old id so two handsets cannot both write)
  and returns the stats, which `restoreFrom()` in `app.js` turns back into local progress. Everyone
  who was already using it was set to **1234**; `sua_claim` returns `must_change` and the app sends
  them straight to choosing their own. Two things cannot be restored because they are only ever
  synced as counts: which voice notes were played and which practice lines were said.
  **Team board:** open to every phone via `sua_board`, which deliberately returns only a name and
  four numbers (levels, xp, lightning, gauntlet) — `sua_team` stays behind the manager code because
  it carries everything. It drops test-looking names and merges one person's devices into a single
  row; the page filters test names again (`TEST_NAME`) because only Victor can change the database.
  **Gauntlet:** endless run in Games, three lives, dealt from every question, leaning harder on
  couple cards and the phone's own past misses as the run grows.
  The SQL for all of this is in `academy/server/migration.sql` and is **not** applied from here —
  Victor runs it at `https://supabase.com/dashboard/project/cdkopyphjvfxjqhasrae/sql/new`.
  Changing a function's return columns needs `drop function` first (Postgres 42P13). Each phone sends its levels,
  best runs, right and wrong answers per level, a log of its last lessons, its days active and its
  Street practice results (`payload()` in `app.js`; `sua_save` takes up to 16 KB). The manager panel (Me tab > Manager panel,
  or the team link with `#team`) reads the team with the manager code, which is stored only as a
  hash and changed from the panel. Everything in the panel comes from other phones, so `team.js`
  escapes every name and clamps every number. There is no WhatsApp report any more.
  Street practice runs two ways. The Claude version is a copy of the app published as a claude.ai artifact with the
  `sample` capability (https://claude.ai/artifact/Ejc8Grqk3BR9Y1avEkbAYY; build it with `build.py` without `--page`): the
  couple and Shoco run on each worker's own Claude account, free for the owner. That copy can't reach Supabase, so its
  score page links to the team link with `#rp=...`, which adds the result on the phone (`rpImport()` in `street.js`).
  On the team link, Street practice calls the Edge Function `sua-roleplay` (source in `academy/server/`: the function in
  `sua-roleplay/`, the tables and functions in `migration.sql`). It uses the owner's Anthropic key from the Edge
  Function secret `SUA_ANTHROPIC_KEY`; without it, it answers `off` and the page points to the Claude version. Optional
  secrets: `SUA_RP_MODEL` (default `claude-haiku-5-5`), `SUA_RP_PER_DAY` (chats per phone per day, 6),
  `SUA_RP_TEAM_DAY` (150). With `SUA_OPENAI_KEY` also set, the voice call goes through the server (`voice.ts`):
  the phone records you (MediaRecorder, and it sends when you pause), the function transcribes it
  (`SUA_STT_MODEL`, default `gpt-4o-mini-transcribe`) and reads the couple's lines in natural voices
  (`SUA_TTS_MODEL`, default `gpt-4o-mini-tts`). Without it, phones use their own speech recognition and voices,
  which iPhones often don't pass to the page. The same key turns the voice call into a live call (the default):
  the function mints a one-minute OpenAI Realtime key (op `live`, `SUA_LIVE_MODEL`, default `gpt-realtime-2.1-mini`),
  the phone talks to OpenAI directly over WebRTC (`liveStart()` in `street.js`), the couple answers in about a
  second with the same knowledge and reactions (`liveInstructions()` in `street-core.js`; one voice, so the lead
  person passes on what the partner says), and the transcript goes back with op `live_save` for Shoco (Claude) to
  score. If the call can't connect, the recorded way takes over. It runs with `verify_jwt` off because it checks each phone's device id and secret itself.
  The deployed `index.ts` is this repo's, except that it imports `handler.ts` (and with it `street-core.js` and `voice.ts`) from this
  repo at a pinned commit, so what runs is what's in git: after changing either, push, then redeploy `index.ts` with
  the new commit id.
  Chats are kept in `sua_rp_chats` (service role only) and wiped after 30 days. `build.py` keeps
  `server/sua-roleplay/street-core.js` a copy of `src/street-core.js`. Never put the key in the page or the repo.
  Don't link it from guest pages.
- `scripts/verify.js` — zero-dependency Node script, run with `node scripts/verify.js`. Checks
  every `gallery`/`pdf`/`video`/`partnerLogo`/`pdfs[]` path in `data.js` resolves to a real file,
  that `DATA_VERSION` matches between `app.js`/`admin.js`, and that no responsive CSS rule resets
  a safe-area-aware `padding-top`/`margin-top` via a bare shorthand (the exact bug class that has
  shipped here before — a shorthand `padding: ...` later in the cascade silently wins over an
  earlier longhand `padding-top: calc(... var(--safe-top) ...)`). Not wired into anything
  automatically; run it by hand after touching `data.js` or `styles.css`.

There is no build tool, package manager, bundler, or test suite (there is now one small
verification script — see above). There's nothing to `npm install` or compile — edit files
directly and serve the directory with any static file server (e.g. `python3 -m http.server`) to
preview changes. `admin.html`'s password check uses `crypto.subtle`, which requires a secure
context (`localhost` or HTTPS), not `file://`.

### Fonts
Inter and Playfair Display are self-hosted from `assets/fonts/` (declared via `@font-face` at the
top of `css/styles.css`), not loaded from the Google Fonts CDN — that was a hard external
dependency with no fallback that failed outright under at least one tested network policy. Only
the `latin` subset is downloaded (10 static-weight woff2 files, ~240KB total), which covers the
site's English/Spanish/Papiamento copy. If a new weight or style is needed, re-fetch it from
Google Fonts' CSS API with an older browser User-Agent (e.g. Chrome 60) to force static
per-weight files rather than a single variable-font blob, then add both the woff2 file and its
`@font-face` block.

## Architecture

### Data model
All content lives in one JS object literal, `defaultData`, in `js/data.js`. Each entry is keyed
by a short ID and shaped like:

```js
"Marea": {
    "type": "food", "title": "Marea", "sub": "Joia Aruba • Caribbean", "desc": "...",
    "gallery": ["assets/Restaurants/Marea/rest_marea_1.jpg", "assets/Restaurants/Marea/rest_marea_2.jpg", ...],
    "pdf": ""
}
```

Recognized fields: `type` (`club`, `food`, `fun`, `spa`, `golf`, `store` — drives which nav
section an item appears in), `title`, `sub`, `desc` (HTML allowed, e.g. embedded `.price-box`
markup), `gallery`, `video`, `pdf`, `partnerLogo`, `duration`, `time`, `itinerary`, `essentials`.
`gallery[0]` is used as the card/hero image — there's no separate `img` field.

**Every path in `gallery`/`pdf`/`video`/`partnerLogo` must be a real file that exists on disk.**
Unlike some earlier versions of this data, there's no `imageCount`-driven filename guessing
anymore — `openDetails()` just renders `item.gallery` as-is. Before adding a path, verify the
file exists; the fallback chain in `image-utils.js` only covers extension typos, not missing
files.

At runtime, `appData` is loaded from `localStorage` (`ib_app_data`) if present and its stored
`ib_data_version` is `>= DATA_VERSION`; otherwise it resets to `defaultData`. **If you change the
shape or content of `defaultData`, bump `DATA_VERSION`** (in both `js/app.js` and `js/admin.js` —
they load independently) so returning visitors' stale cached copy is flushed.

### Rendering pipeline (`js/app.js`)
- `renderApp(sectionId)` — maps a nav section (`portfolio`/`dining`/`activities`/`spa`/`golf`/`store`)
  to a `type`, filters `appData`, and renders the card grid. For `type: 'fun'`, it further filters
  by `inHouseMode` (see below), matching `sub` containing `"red sail"` vs `"rocka"`. Items with an
  empty `gallery` render the branded fallback treatment directly (no failed image request).
- `filterContent()` — client-side search over title/sub/description for the current grid.
- `openDetails(key)` — populates and opens the full-screen detail modal and photo gallery, and
  wires up action buttons for PDF/video. Hides the "Gallery" heading when `gallery` is empty.
- `launchLightbox`/`updateFsImage`/`nextFs`/`prevFs` — full-screen swipeable image/video viewer.
- Focus is moved into the modal/lightbox on open and restored to the triggering element on close
  (`lastFocusedEl`) — keep this pattern when adding new overlays.

### Image error recovery (`js/image-utils.js`)
`handleImgError()` retries a broken image through a short list of fallback transforms (jpg↔png
swap, jpeg→jpg, `decodeURIComponent`) before giving up and hiding the element via
`triggerFallback()`, which shows a branded "IBEROSTAR" placeholder (`.card-fallback` /
`.hero-fallback` in `css/styles.css`) rather than a broken-image icon. Since `js/data.js` paths
are verified against disk, treat this purely as a defensive net for future typos — don't rely on
it to paper over a wrong path; fix the path in `js/data.js` instead.

### Admin panel (`admin.html` + `js/admin.js`)
A separate, unlinked page (not reachable from guest nav) with a client-side password gate
(SHA-256 comparison, unlocked state kept in `sessionStorage`). **This is a deterrent, not real
security** — there's no backend, so anyone who reads the JS can see the check. To change the
password: compute `crypto.subtle.digest('SHA-256', new TextEncoder().encode('newPassword'))`,
hex-encode it, and replace `ADMIN_PASSWORD_HASH` in `js/admin.js`.

Once unlocked, it's a form-based CRUD UI over `appData`. Saves/deletes write straight to
`localStorage['ib_app_data']` (device-local only). "Copy Code" (`exportData()`) copies a
formatted `const defaultData = {...}` string to the clipboard — the workflow for a permanent
change is: edit in the admin panel, verify it looks right, then paste the exported object into
`js/data.js` and commit it.

### In-house mode / time theming
- Tapping the greeting text 3× toggles `inHouseMode` (persisted to `localStorage` as
  `ib_in_house`), which switches the Activities section between Red Sail (in-house) and Rocka
  Beach (off-site) partner tours.
- Tapping the greeting also cycles `toggleTimeMode()`, and `updateTimeVibe()` drives time-of-day
  ambient theming (sky gradient, stars/fireflies/boat decorations) based on the visitor's local
  clock.

### Device detection
On `DOMContentLoaded`, the app sniffs `navigator.userAgent` and adds one of
`device-ios`/`device-android`/`device-tablet`/`device-mobile`/`device-desktop` classes to `<html>`;
a fair amount of CSS and touch-gesture logic (modal swipe-to-close, nav layout) branches on these
classes rather than pure media queries.

## Conventions when editing

- New content items go into `js/data.js`, grouped under the existing `// CLUBS` / `// GOLF` /
  `// STORE` / `// FUN` / `// SPA` / `// FOOD` comments — keep new entries under the matching
  section rather than appending at the end.
- Match the existing asset folder layout (`assets/<Category>/<PropertyName>/<prefix>_<n>.<ext>`),
  but list the real files explicitly in `gallery` rather than relying on any numbering convention —
  gaps and mixed extensions in a folder (there are several) are fine as long as `gallery` lists
  exactly what's there.
- Accessibility: new interactive elements should get `alt`/`aria-label`/`role` as appropriate —
  this was a deliberate cleanup pass, not incidental, so don't regress it.
- Commit history (pre-refactor) shows this repo was edited as a series of direct `index.html`
  updates with terse commit messages (`Update index.html`). Feel free to write more descriptive
  messages going forward.
