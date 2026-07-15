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
- `Hotels/`, `Restaurants/`, `Spa/`, `Golf/`, `Activites/` (note: misspelled, not "Activities"),
  `Logos/` — media assets (jpg/png/pdf/mp4) in per-property subfolders.

There is no build tool, package manager, bundler, linter, or test suite. There's nothing to
`npm install` or compile — edit files directly and serve the directory with any static file
server (e.g. `python3 -m http.server`) to preview changes. `admin.html`'s password check uses
`crypto.subtle`, which requires a secure context (`localhost` or HTTPS), not `file://`.

## Architecture

### Data model
All content lives in one JS object literal, `defaultData`, in `js/data.js`. Each entry is keyed
by a short ID and shaped like:

```js
"Marea": {
    "type": "food", "title": "Marea", "sub": "Joia Aruba • Caribbean", "desc": "...",
    "gallery": ["Restaurants/Marea/rest_marea_1.png", "Restaurants/Marea/rest_marea_2.png", ...],
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
- Match the existing asset folder layout (`<Category>/<PropertyName>/<prefix>_<n>.<ext>`), but
  list the real files explicitly in `gallery` rather than relying on any numbering convention —
  gaps and mixed extensions in a folder (there are several) are fine as long as `gallery` lists
  exactly what's there.
- The `Activites/` folder name is a pre-existing typo baked into the filesystem. Don't silently
  rename it to "Activities" — that would require moving every file and updating every reference
  in `js/data.js` in the same change.
- Accessibility: new interactive elements should get `alt`/`aria-label`/`role` as appropriate —
  this was a deliberate cleanup pass, not incidental, so don't regress it.
- Commit history (pre-refactor) shows this repo was edited as a series of direct `index.html`
  updates with terse commit messages (`Update index.html`). Feel free to write more descriptive
  messages going forward.
