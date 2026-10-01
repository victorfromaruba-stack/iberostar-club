# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A guest-facing web app for the Iberostar Aruba resort: our resorts, restaurants, spa, golf, tours
and retail partners. It is a mobile-first, installable PWA ("v4", Concierge design): a Today screen
that changes with the time of day, Dine / Explore / Spa / Saved tabs, a global search, a detail
sheet with photos, prices, menus and video, a concierge request ticket, and offline support through a
service worker. There is no backend and no build step — static HTML/CSS/JS plus a media library,
hosted on GitHub Pages under `/iberostar-club/`.

## Repository structure

| Path | What it is |
|---|---|
| `index.html` | Guest shell: inline pre-paint BOOT script (Aruba clock, NOAA sun times, phase/theme → no white flash), font preloads, SVG icon sprite, top nav (≥1024px), app bar, tab bar, toast/offline/preview pills, and the empty overlay containers. Loads `js/image-utils.js` → `js/data.js` → `js/media.js` → `js/lib.js` → `js/app.js`, all classic `defer`. |
| `css/styles.css` | All guest styling. Design tokens at the top (`:root` + `html[data-theme="light"|"dark"]`), then shell, components, screens, overlays. |
| `js/data.js` | The content catalog, `const defaultData = {…}`, grouped under `// CLUBS`, `// GOLF`, `// STORE`, `// FUN`, `// SPA`, `// FOOD`. Edit this to add/remove/fix content. |
| `js/media.js` | **Generated** by `scripts/build-images.py` — never edit. `const MEDIA = {img, pdf, video}`. Optional at runtime: if it 404s, everything falls back to the original files. |
| `js/lib.js` | Pure helpers, no DOM writes (also `module.exports` for node tests): time/sun/phase (wraps `window.IB_TIME` from the BOOT script), price parsing, durations/slots, facets (area, cuisine, meals, hours/open state, tags, channel, status), search index + synonyms, Today picks scoring, media helpers (`imgHTML`, `logoImgHTML`, `phHTML`). |
| `js/app.js` | Guest app: state, `store` (try/catch localStorage wrapper), router + history model, overlay manager, views, cards, detail sheet, search, lightbox, menus/video, concierge request/tickets, settings, SW registration. Last line calls `boot()`. |
| `js/image-utils.js` | Device classes on `<html>`; one capture-phase `load`/`error` listener on `document` (no inline handlers anywhere); the 3-layer image fallback; viewport-gated loading of `data-src` images (`observeLazy`, called from `sweepImages`). |
| `sw.js` | Service worker (repo root). Versioned shell cache + media + runtime caches; see "Service worker" below. |
| `manifest.webmanifest` | Install metadata (start_url `./#/today`, navy theme, `any` + `maskable` icons, tab shortcuts). |
| `admin.html` + `js/admin.js` + `css/admin.css` | Separate, unlinked staff editor (password gate). `admin.css` is self-contained — admin never loads `styles.css`, so guest CSS changes cannot break it. |
| `qr.html` | Printable "scan to save" page (inline SVG QR for `https://victorfromaruba-stack.github.io/iberostar-club/` — regenerate the path data if the URL changes) + Add-to-Home-Screen steps. |
| `scripts/verify.js` | Zero-dependency checker — run `node scripts/verify.js` before every commit (see below). |
| `scripts/build-images.py` | Image pipeline (Python 3.9+, Pillow ≥10; ffmpeg/pdfinfo optional). |
| `assets/` | Originals in `assets/<Category>/<Property>/…` (`Hotels/`, `Restaurants/`, `Spa/`, `Golf/`, `Activities/`, `Logos/`), generated WebP derivatives in `assets/img/`, self-hosted fonts in `assets/fonts/`. |
| `.nojekyll` | Required: GitHub Pages' Jekyll would otherwise drop `_`-prefixed paths. Never create `_`-prefixed dirs under `assets/`. |

There is no package manager, bundler or test suite. Serve the directory with any static server
(`python3 -m http.server`) to preview. `admin.html`'s password check uses `crypto.subtle` and the
service worker needs a secure context: use `localhost` or HTTPS, not `file://`.

### Fonts
Self-hosted latin subsets, declared with `@font-face` at the top of `css/styles.css` (and copied
in `css/admin.css`): **Inter 400/500/600, Playfair Display 600 and 600 italic — only these five
files exist.** No weight 800/900. `index.html` deliberately has **no font preloads** (they competed
with the CSS, scripts and Today hero on slow Wi-Fi; `font-display:swap`). The `@font-face` URLs
must match `SHELL_URLS` in `sw.js`. To add a weight, fetch
it from the Google Fonts CSS API with an old browser User-Agent (e.g. Chrome 60) to get static
per-weight woff2 files, then add the file, its `@font-face` block, and the `sw.js` shell entry.

## The version rule (do not skip)

`DATA_VERSION` in `js/app.js` **and** `js/admin.js`, `VERSION` in `sw.js`, and **every** local
`?v=NNN` in `index.html` and `admin.html` must be equal, and above the number on `main` (what guests
have; `node .claude/skills/release/bump-version.js --check` shows both). Bump them all together
whenever you change anything guests download (data, JS, CSS); `bump-version.js` does it, once per
release. The new `VERSION` creates a fresh `ib-shell-<VERSION>` cache; returning guests see
"Updated info available · Refresh" (or switch silently when the page already runs the new release).
`?v=` files are served **cache-first and treated as immutable per release** by the service worker,
so a shipped JS/CSS/data change without a version bump never reaches returning guests.
`node scripts/verify.js` fails if they drift.

## Data model (`js/data.js`)

```js
"Marea": {
    "type": "food", "title": "Marea", "sub": "Joia Aruba • Caribbean",
    "area": "joia", "cuisine": "Caribbean",
    "desc": "…HTML allowed, incl. <div class=\"price-box\"><div class=\"price-row\">…</div></div>…",
    "gallery": ["assets/Restaurants/Marea/rest_marea_1.jpg", …],
    "logo": "assets/Restaurants/Marea/rest_marea_13.jpeg",
    "pdfs": [{ "label": "Dessert Menu", "url": "assets/Restaurants/Marea/menu_marea_desserts.pdf" }, …]
}
```

- `type` ∈ `club | food | fun | spa | golf | store` (unknown types are dropped by `normalize`).
- **`gallery[0]` is the card and hero image. `gallery` holds photos only — logos and wordmarks go
  in `logo`.** Every path in `gallery`/`logo`/`pdf`/`pdfs[].url`/`video`/`partnerLogo` must be a
  real file (exact case — GitHub Pages is case-sensitive). verify.js checks this.
- Existing fields: `title`, `sub` (partner • category, or location), `desc`, `video`, `pdf`,
  `pdfs`, `partnerLogo`, `duration`, `time` (slots, `|` or ` or ` separated, optional `Label:`
  prefix), `itinerary` and `essentials` (arrays, one entry per line).
- **Optional v4 fields** (all optional; absent = derived default):

  | Field | Type | Default when absent |
  |---|---|---|
  | `logo` | path | none |
  | `area` | `joia`\|`tierra`\|`partner`\|`island` | /joia/ or /tierra/ in sub; food → partner; fun → island |
  | `cuisine` | string | text after "•" in sub (food) |
  | `meals` | `breakfast`\|`lunch`\|`dinner`\|`drinks`[] | bar/rooftop → drinks; bagel/breakfast/brunch → breakfast+lunch; else dinner |
  | `hours` | string[] like `"Dinner 17:00-23:00"`, `"Daily 07:00-23:00"`, `"Lunch 11:00-17:00 Mon-Sat"`, `"Dinner from 18:00"` | no open/closed status shown |
  | `tags` | string[] | derived from title/desc (sunset, water, snorkel, offroad, island, private, kids, …) |
  | `featured` | phases[] (`morning`\|`day`\|`sunset`\|`night`) | none (+10 in Today picks for that phase) |
  | `channel` | `in-house`\|`off-site`\|`both` | /red sail/ → in-house, /rocka/ → off-site, else both |
  | `status` | `''`\|`coming-soon` | coming-soon if sub says "Coming soon"/"In development" |
  | `iberocash` | boolean | true except clubs, coming-soon and complimentary items |
  | `priceFrom` | number | min of parsed price rows (add-on/optional/extra/each-additional and child rows excluded) |
  | `phone` (E.164), `whatsapp` (digits), `bookUrl` (https), `bookingNote`, `address` | | no button / no contact section |
  | `order` | number | data order |

- **Never invent content.** Do not add hours, phone or WhatsApp numbers, booking links, addresses,
  prices, redemption steps or IberoCash copy that staff have not verified. `CONCIERGE` and
  `IBEROCASH_NOTE` in `js/app.js` stay empty until staff supply real values (the WhatsApp button
  and the IberoCash info button only appear when they are set).
- Keep new entries under the matching `// SECTION` comment. Admin's export and "Download data.js"
  re-create these comments, so a pasted export keeps them.
- `HOURS_RE` is duplicated verbatim in `js/lib.js` and `js/admin.js` — keep them in sync
  (verify.js warns on drift).

### Where the guest app gets its data
The guest app always renders `normalize(defaultData)` and **never writes `ib_app_data`**. The only
exception is staff preview: if `localStorage.ib_admin_preview === '1'`, the admin's local catalog in
`ib_app_data` is validated and used, and a "Preview: local edits" pill with "Hide preview" shows.
"Hide preview" sets the flag to `'0'` (paused, not removed): the guest app ignores the edits, the
admin still loads them, and the next admin save sets `'1'` again. Legacy
`ib_app_data` without the flag is ignored (not deleted). All storage goes through `store`
(never throws: private mode / blocked storage still renders).

## Image pipeline (`scripts/build-images.py`)

Run by hand after adding or replacing photos: `python3 scripts/build-images.py [--contact [--out
PATH]] [--video] [--force] [--jobs N]`. It reads `js/data.js`, writes WebP derivatives
`assets/img/<slug>-<sha1[:8]>-<w>.webp` (480/800/1600, never upscaled; logos 160/320/640), LQIP and
dominant colours into `js/media.js`, the ink/ivory header logos, the maskable icon and the iOS startup
images (`STARTUP_SIZES`, one per iPhone size class; each needs a matching
`apple-touch-startup-image` link in `index.html`). One unreadable photo (HEIC, truncated upload) is
reported and skipped, not fatal (exit 1). `CROPS` trims a baked-in edge from a source before encoding.
If a Today hero's derivative id changes, update `HERO_PRELOAD` in `index.html`'s boot script
(verify.js checks it). Idempotent (content-hashed names; unchanged sources are skipped). `--contact` writes a
contact sheet to spot logos used as photos; `--video` re-encodes the golf film to 720p (then point
`video` at the new file). Commit the outputs. Until it is re-run, newly added photos simply load the
original (verify.js warns). The app works without `js/media.js` at all.

## Guest app architecture (`js/app.js`)

### Routes (hash router)
| Hash | Shows |
|---|---|
| `#/today` (default), `#/dine`, `#/explore`, `#/spa`, `#/saved`, `#/resorts` | views; `?f=a,b&q=text` on dine/explore (chips + query), `?ids=a,b` on saved (shared list) |
| `#/search?q=` | search overlay |
| `#/settings` | settings sheet (theme Auto/Light/Dark, offline status) |
| `#/saved/show` | saved-list ticket |
| `#/item/:key` + `/photos/:n` \| `/menu` \| `/menu/:i` \| `/video` \| `/request` \| `/request/show` | detail sheet and its overlays |

Parent view by type: food → dine; fun/golf/store → explore; spa → spa; club → resorts.

### History model
Overlays `pushState`; filters, queries and lightbox paging `replaceState`; tab → tab replaces,
except leaving Today, which pushes (Back from any tab → Today → exits). A cold deep link to an
overlay seeds Today → parent view → overlay levels, so Back peels one level at a time and never
drops the guest out of the app. Use `go(hash, {replace})`, `navigate(hash, srcEl)`, `closeTop()`.

### Overlay manager
**New overlays must use `Overlay.open(el, …)` / `Overlay.close(el, …)`** and be registered in
`OV_RENDER` / `OV_EL` plus the route parser. The manager sets `inert` on the page and lower
overlays, adds `html.ov-open`, applies the iOS body scroll-lock, moves focus to `[data-autofocus]`
or the overlay heading after the open class is added, and restores focus on close (opener → the
card link → the view h1). Closed overlays carry `hidden`. Esc → `closeTop()`.

### Kept globals (console/legacy)
`nav(id)`, `renderApp(id)`, `openDetails(key)`, `closeModal()`, `filterContent()`,
`launchLightbox(list|key, i)`, `viewPdf(url)`, `viewVideo(url)`, `sharePackage(key)`,
`toggleTimeMode()` (console-only phase preview), `showToast(msg)`.

### Images
Cards use `imgHTML()` (srcset from `MEDIA`, `width`/`height`, LQIP + dominant colour on the
`.media` box). Only the Today hero and the first two cards of a view are eager; every other image
is rendered with `data-src` and released by `observeLazy()` when it comes within ~300px of the
viewport (rails release card by card as they scroll). Phone tiles cap density at ~2× via
`(min-resolution:2.5dppx)` in `sizes`. Fallback layers: no MEDIA entry → original; derivative fails
→ `data-orig`; original fails → jpg/png/jpeg/decode retries (skipped offline) → the branded `.ph`
placeholder element. Treat the fallback as a safety net — fix wrong paths in `data.js`.

### Time, theme and modes
- The BOOT script computes the Aruba phase (`morning` [sunrise−30, 11:00), `day`, `sunset`
  [sunset−75, sunset+30), `night`) and sets `html[data-phase]` and `html[data-theme]` before first
  paint. Theme preference `ib_theme` = auto|light|dark (Settings); auto = light morning/day, dark
  sunset/night.
- Ambient motion is only the Today hero Ken Burns and, at night, an 8-star twinkle — all paused
  under overlays, when hidden, and with reduced motion. The old decoration layers (waves, palms,
  clouds, fish, dolphin, birds, fireflies, boat, glow, shimmer, tilt, splash) are deleted; do not
  bring them back.
- Debug URL params (stripped from the URL after load): `?time=morning|day|sunset|night|auto`
  (session override), `?mode=inhouse|offsite` (lobby iPads), `?nosw=1` (unregister the SW + clear
  caches on this device).
- In-house mode (`ib_in_house`): three taps on the Today greeting, `?mode=`, or admin's "Lobby
  device" switch. Shows Red Sail (in-house) instead of Rocka Beach (off-site) tours. It never
  changes the theme.

### Design tokens and contrast
Colours are semantic tokens (`--bg`, `--surface`, `--text`, `--text-2`, `--text-3`, `--accent`,
`--accent-text`, `--on-accent`, …) defined for light and dark. Body text pairs must stay ≥4.5:1 and
`--focus` ≥3:1 in both themes (verify.js computes this). Gold is never text on light backgrounds
(use `--accent-text`); text on photos only over a scrim. Every tab stop needs a visible
`:focus-visible` ring; never add `outline:none` except under `:focus:not(:focus-visible)`.
Sticky chrome (tab bar, app bar) stays ≥0.94 alpha. Respect safe areas with **longhand**
`padding-top: calc(var(--safe-top) + …)` — a later shorthand `padding:` silently wins (verify.js
checks this).

## Service worker (`sw.js`)

- Registered by `app.js` (`sw.js`, scope `./`) after first render, on HTTPS/localhost only.
  `app.js` calls `registration.update()` on resume and while open, at most once every 30 min
  (`checkForUpdate`).
- Caches: `ib-shell-<VERSION>` (shell: `?v=<VERSION>` files cache-first and pinned to this release;
  `?v=<other>` files only ever from that release's own cache or the network; navigations network-first
  with a 3 s timeout, stored only when the page references this release; only the app's own URLs
  fall back to `index.html` offline, other pages get an offline page; `qr.html` is precached), `ib-media-v1` (`assets/img`, fonts, `assets/Logos`;
  cache-first, immutable), `ib-runtime-v1` (PDFs and other `assets/**`; stale-while-revalidate,
  150 entries). Never cached: non-GET, cross-origin, Range, `*.mp4`.
- Messages: `warm` (sent once per session: card-size photo of every item + Today heroes, ~0.6 MB),
  `precache-all` (admin "Cache everything": every photo, logo, PDF, poster, ~24 MB, with progress),
  `clear`, `skip-waiting` (the "Refresh" button in the update toast), `status`.
- Support: `?nosw=1` fixes one device. **Kill switch** for every device: replace `sw.js` with the
  snippet in its header comment (unregister, delete `ib-*` caches, `clients.navigate`), deploy, and
  keep it live for a few weeks.

## Admin panel (`admin.html` + `js/admin.js`)

Unlinked staff page with a client-side SHA-256 password gate (a deterrent, not security — anyone
can read the JS). To change the password, hex-encode
`crypto.subtle.digest('SHA-256', new TextEncoder().encode('newPassword'))` into
`ADMIN_PASSWORD_HASH`. Features: searchable grouped item list (with missing-file warnings), a form
for every field including the optional v4 fields and an "Extra fields (JSON)" box, live hours
preview, rename, gallery thumbnail strip, "Copy code" / "Download data.js", offline "Cache
everything" / "Clear", and the "Lobby device" switch.

Saving merges into the existing item (`{...appData[key], ...fields}`) so unknown fields survive,
splits list fields on newlines only, writes `ib_app_data`, `ib_data_version` and
`ib_admin_preview='1'` (device-local preview only). **To publish:** verify in the guest app on that
device, then Download data.js (or Copy code), replace `js/data.js`, bump the version, run
verify.js, commit. "Reset to published" removes the local preview.

## `scripts/verify.js`

`node scripts/verify.js [rootDir] [--all]` — exit 0 = pass (warnings never block a deploy), 1 = a
check failed. Checks: (1) every asset path exists with exact case, no root-absolute paths;
(2) optional-field types/enums, hours grammar (warning); (3) keys match `^[A-Za-z0-9_-]+$`;
(4) version sync (app.js, admin.js, sw.js, every `?v=`), sw.js shell URLs exist; (5) `media.js`
hashes/derivatives, `.nojekyll`, no `_` dirs; (6) CSS lint (focus rings, no stray `outline:none`,
no `body .device-` selectors, only allowlisted infinite animations, no overshoot easing,
safe-area shorthand cascade); (7) HTML lint (zoom allowed, no inline `on*` handlers, local
references exist, manifest valid); (8) token contrast in both themes; (9) admin.js save/merge and
no comma-splitting of itinerary/essentials; (10) every CSS `url()` exists, unused font files.

## Conventions when editing

- Run `node scripts/verify.js` after touching `data.js`, CSS, HTML, `sw.js` or the version.
- Content goes in `js/data.js` under the matching `// SECTION`; list real files explicitly in
  `gallery` (gaps and mixed extensions in a folder are fine). Re-run the image pipeline after adding
  photos.
- Every control is a real `<a>`/`<button>` with an accessible name; cards are stretched links with a
  sibling save button; headings follow h1 (view) → h2 (groups/sheet title) → h3 (cards/sections).
  Inputs are ≥16px. No inline `on*` handlers or `javascript:` URLs (verify.js lints this).
- Write descriptive commit messages (the old history is a run of "Update index.html").

## Project skills (`.claude/skills/`)

| Skill | Use it to | Helpers in the skill folder |
|---|---|---|
| `add-content` | Add, update, mark coming-soon or remove a resort, restaurant, tour, spa, golf or shop item, its photos and menus | `to_jpg.py` (HEIC/oversized photos → upright, named JPEGs in the repo), `check-item.js` (how the app parses an item, format mistakes; `--files <Key>` before a removal) |
| `release` | Ship to GitHub Pages (`main`): bump, build, verify, commit, push or merge, confirm live; rollback and kill switch | `bump-version.js` (the version rule in one command: fetches main, bumps once per release, always above main, settles version-only conflicts), `check-live.sh` (is main's commit deployed and this release served?) |
| `preview` | Serve locally and screenshot the guest app and admin (iPhone 13 + 1440×900, day/night, lobby mode; a new item's card, search result, sheet and photos) with console/404/overflow/missing-card checks | `preview.js` (Playwright; `--check` tests the setup; `NODE_PATH=…` on the same command line if Playwright is installed elsewhere) |
