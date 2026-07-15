# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A single-file guest-facing web app for the Iberostar Aruba resort ("club" portfolio of hotels,
restaurants, spa, golf, activities, and retail partners). It's a mobile-first PWA-style directory:
browse by category, view a detail modal with a photo gallery/lightbox, view PDFs/videos, and share
items. There is no backend — everything is static HTML/CSS/JS plus a local media library.

## Repository structure

- `index.html` — the entire application. All markup, CSS, and JS live in this one file
  (~1600 lines, two `<script>` blocks: an early one in `<head>` for device detection and image
  error-recovery, and a large one before `</body>` with app state, rendering, and the data model).
- `Hotels/`, `Restaurants/`, `Spa/`, `Golf/`, `Activites/` (note: misspelled, not "Activities"),
  `Logos/` — media assets (jpg/png/pdf/mp4), organized in per-property subfolders. Filenames
  generally follow `<prefix>_<n>.<ext>` (e.g. `rest_marea_3.jpg`), which the app relies on to
  auto-generate gallery sequences (see Image Galleries below).

There is no build tool, package manager, bundler, linter, or test suite. There's nothing to
`npm install` or compile — edit `index.html` directly and open it in a browser (or serve the
directory with any static file server) to preview changes.

## Architecture

### Data model
All content lives in one JS object literal, `defaultData` (near the end of the second
`<script>` block). Each entry is keyed by a short ID and shaped like:

```js
'Marea': { type:'food', title:'Marea', sub:'Joia Aruba • Caribbean', desc:'...',
           gallery:['Restaurants/Marea/rest_marea_1.jpg'], pdf:'Restaurants/Marea/menu_marea.pdf',
           imageCount: 20 }
```

Recognized fields: `type` (`club`, `food`, `fun`, `spa`, `golf`, `store` — drives which nav
section an item appears in), `title`, `sub`, `desc` (HTML allowed, e.g. embedded `.price-box`
markup), `img`/`gallery`, `video`, `pdf`, `partnerLogo`, `imageCount`, `duration`, `time`,
`itinerary`, `essentials`.

At runtime, `appData` is loaded from `localStorage` (`ib_app_data`) if present and its stored
`ib_data_version` is `>= DATA_VERSION`; otherwise it resets to `defaultData`. **If you change the
shape of `defaultData` or fix asset paths, bump `DATA_VERSION`** so returning visitors' stale
cached copy is flushed — this has been done repeatedly in commit history (search `DATA_VERSION`).

### Image galleries
When `imageCount` is set, `openDetails()` does not read `gallery` — it derives filenames by
taking the main image path, finding the last `_` and last `.`, and generating
`prefix_1.ext … prefix_N.ext`. This means adding an image to a property's gallery is usually just
a matter of dropping a correctly-numbered file (e.g. `rest_marea_14.jpg`) into the folder and
bumping `imageCount`, not editing the `gallery` array.

### Rendering pipeline
- `renderApp(sectionId)` — maps a nav section (`portfolio`/`dining`/`activities`/`spa`/`golf`/`store`)
  to a `type`, filters `appData`, and renders the card grid. For `type: 'fun'`, it further filters
  by `inHouseMode` (see below), matching `sub` containing `"red sail"` vs `"rocka"`.
- `filterContent()` — client-side search over title/sub/description for the current grid.
- `openDetails(key)` — populates and opens the full-screen detail modal, builds the gallery, and
  wires up action buttons for PDF/video.
- `launchLightbox`/`updateFsImage`/`nextFs`/`prevFs` — full-screen swipeable image/video viewer.

### Image error recovery
`handleImgError()` (top `<script>`) retries a broken image through a fixed list of fallback path
transforms (extension swap, `Activities/`↔`Activites/`, case fixes, `decodeURIComponent`, a couple
of hardcoded one-off path fixes for `Marea`/`Spa`) before giving up and hiding the element via
`triggerFallback()`. If you rename or move an asset, prefer fixing the actual path in `defaultData`
over relying on this fallback chain — it's a safety net, not a routing layer.

### In-house mode / hidden gestures
- Tapping the greeting text 3× toggles `inHouseMode` (persisted to `localStorage` as
  `ib_in_house`), which switches the Activities section between Red Sail (in-house) and Rocka
  Beach (off-site) partner tours.
- Tapping the header logo 5× opens a hidden **Admin Editor** panel (`#adminPanel`) — a form-based
  CRUD UI over `appData`, with no authentication. Saves/deletes write straight to
  `localStorage['ib_app_data']` and reload the page. "Copy Code" (`exportData()`) copies a
  formatted `const defaultData = {...}` string to the clipboard — the intended workflow for making
  a permanent change is: use the admin panel to test, then paste the exported object back into
  `index.html` and commit it, since localStorage edits alone don't persist across devices/clears.
- Tapping the greeting also cycles `toggleTimeMode()`, and `updateTimeVibe()` drives time-of-day
  ambient theming (sky gradient, stars/fireflies/boat decorations) based on the visitor's local
  clock.

### Device detection
On `DOMContentLoaded`, the app sniffs `navigator.userAgent` and adds one of
`device-ios`/`device-android`/`device-tablet`/`device-mobile`/`device-desktop` classes to `<html>`;
a fair amount of CSS and touch-gesture logic (modal swipe-to-close, nav layout) branches on these
classes rather than pure media queries.

## Conventions when editing

- Keep everything in `index.html` — this project intentionally has no build step or module
  system. Don't introduce a bundler, framework, or split JS/CSS into separate files unless
  explicitly asked.
- New content items go into `defaultData`, grouped under the existing `// CLUBS` / `// GOLF` /
  `// STORE` / `// FUN` / `// SPA` / `// FOOD` comments — keep new entries under the matching
  section rather than appending at the end.
- Match the existing asset folder layout (`<Category>/<PropertyName>/<prefix>_<n>.<ext>`) and the
  `prefix_<n>.<ext>` numbering convention so `imageCount`-based gallery generation keeps working.
- The `Activites/` folder name is a pre-existing typo baked into both the filesystem and the
  fallback-swap logic in `handleImgError`/`forceOfflineCache`. Don't silently rename it to
  "Activities" — that would require updating every reference and the fallback list, which assumes
  the typo'd name is correct on disk.
- Commit history shows this repo is edited as a series of direct `index.html` updates (no PRs/CI
  in history) — commit messages are typically terse (`Update index.html`); follow that style unless
  told otherwise, but feel free to be more descriptive.
