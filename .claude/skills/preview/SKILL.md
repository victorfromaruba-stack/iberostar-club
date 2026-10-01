---
name: preview
description: Use when you need to see the Iberostar Aruba guest app or admin page running locally — to check a UI or content change before shipping, take screenshots, compare day vs night or lobby (in-house) mode, or confirm a new restaurant/tour looks right (its card, search result, detail sheet and photos). Covers "preview the site", "show me what it looks like", "take screenshots", "check it on a phone", "does it look OK at night", "test the admin page".
---

# Preview locally and take a screenshot set

No build step: serve the repo folder and open it. `admin.html`'s password check and the service
worker need a secure context, so use `localhost`/`127.0.0.1`, never `file://`. **Run every command
below from the repo root** (Node looks for Playwright from the script's folder upwards, then in
`NODE_PATH`).

## 1. Check the setup (once per session)

```sh
node .claude/skills/preview/preview.js --check
```

It prints which Playwright and Chromium it will use, starts the browser once and ends `ready`
(exit 0). If it says `playwright not found`, install it into a scratch folder (outside the repo —
there is no package.json here, and none should be added) and give `NODE_PATH` **on the same command
line** every time (shell variables don't carry over between separate commands in Claude Code):

```sh
npm i --prefix /tmp/ib-pw playwright
NODE_PATH=/tmp/ib-pw/node_modules node .claude/skills/preview/preview.js --check
```

Use your session's scratch directory instead of `/tmp/ib-pw` when you have one. `--prefix` matters:
a plain `npm i` inside a folder nested under another `package.json` installs into that parent.
Browser: `$CHROMIUM_PATH` if set, else `/opt/pw-browsers/chromium` if it exists, else Playwright's
own Chromium — download that once with `node /tmp/ib-pw/node_modules/playwright/cli.js install chromium`.

## 2. Take the screenshot set

```sh
node .claude/skills/preview/preview.js --out /tmp/ib-preview
```

(prefix `NODE_PATH=…` if step 1 needed it). `preview.js` starts `python3 -m http.server` on a free
port bound to `127.0.0.1` for this folder (and stops it at the end), then shoots each screen on an
**iPhone 13** (390×664 viewport, 3×) and a **1440×900** desktop, at `?time=day` and `?time=night`:

| Shot (file `<device>-<time>-<shot>.png`) | URL | Notes |
|---|---|---|
| today, dine, explore, spa | `#/today` … `#/spa` | the four tab views |
| saved | `#/saved` | seeded with Marea, UTV, SpaMain so the list isn't empty |
| search | `#/search?q=sunset` | `--query` to change; with `--item` (and no `--query`) one `search-<Key>` per item instead, searching its title — ✗ if the item is not listed |
| card-\<Key\> | the item's tab (`#/dine`, `#/explore`, `#/spa`, `#/resorts`) | only with `--item`: just that card, scrolled into view with its photo loaded; ✗ if the card is missing |
| detail-\<Key\>, lightbox-\<Key\> | `#/item/<Key>`, `#/item/<Key>/photos/1` | Marea and UTV unless `--item`; no lightbox for an item without photos (the script says so) |
| inhouse-today, inhouse-explore | `?mode=inhouse` | lobby iPad mode: Red Sail instead of Rocka Beach |
| admin-gate, admin-edit-\<Key\> (file `<device>-admin-….png`, no time) | `admin.html`, `admin.html#<Key>` | the editor is unlocked through its session flag, no password needed; only the first `--item` |

In-house-only (Red Sail) items get their card and search shots in lobby mode, where guests see
them. Guest URLs carry `?nosw=1` and the browser context blocks service workers (admin included),
so a stale cached release can't be what you're looking at. Motion is reduced so sheets and the hero
are captured settled. The full set is 52 shots in about 80 seconds; narrow it while iterating:

```sh
node .claude/skills/preview/preview.js --item Marea --only dine,card,search,detail,lightbox --devices phone --times day,night --out /tmp/ib-preview
```

Options: `--item K1,K2` · `--only today,dine,explore,spa,saved,search,card,detail,lightbox,inhouse,admin` ·
`--devices phone,desktop` · `--times day,night` (also `morning`, `sunset`) · `--query TEXT` ·
`--full` (whole page for the tab, saved and lobby views, scrolled through first so every lazy photo
has loaded; the other shots are one screen) · `--css-pixels` (1× phone images, smaller files) ·
`--url URL` (use a server that is already running — it must serve this folder) · `--any-server`
(with `--url`: skip that check, e.g. to shoot the live site) · `--root DIR`. An unknown shot,
device or time stops the script with exit 2 before anything runs.

Output: the PNGs, `index.html` (contact sheet — open it, or Read the PNGs directly) and
`report.json`. Each line of the console summary is `✓`/`✗` with the phase/theme the page actually
rendered. Exit 0 = clean; 1 = something flagged; 2 = setup problem (bad option, no
Playwright/Chromium, `--url` dead or serving another folder, unknown `--item`).

## 3. What the script flags (✗) — fix these first

- **console errors / page errors** — any JavaScript error is a bug.
- **failed requests** — a 404 usually means a wrong path or wrong case in `js/data.js`
  (`node scripts/verify.js` names it). Cancelled requests (`ERR_ABORTED`, e.g. admin's HEAD probes)
  are ignored on purpose.
- **broken images** — an image went through every fallback and shows the IBEROSTAR placeholder.
- **scrolls sideways** — the page is wider than the screen (something overflows).
- **asked for night, page shows day** — the `?time=` override did not take.
- **search did not list \<Key\>** / **no card for \<Key\>** — the item is missing from search or
  from its tab (wrong `type`, coming-soon, or lobby/off-site `channel`; `check-item.js` explains).
- *(note, not ✗)* **N image(s) load the original, no WebP yet** — a photo has no derivative in
  `js/media.js` (or its derivative failed): run `python3 scripts/build-images.py`.
  `node scripts/verify.js` warns about the same thing.

## 4. What to look at yourself

- **Photos**: card and hero images are real photos (not a logo, menu or the branded placeholder,
  unless the item truly has no photos); nothing cropped badly or rotated. Judge a new item's card
  from `card-<Key>`.
- **Text over photos** is readable (Today hero, detail hero), in both day and night.
- **Night / dark theme**: no light boxes left behind, gold accents not used as small text on light
  backgrounds, enough contrast on cards and chips.
- **Prices and times**: "From $X" on tour cards, the price list in the sheet, durations ("4 h"),
  departure times, open/closed lines — match what staff gave
  (`node .claude/skills/add-content/check-item.js <Key>` shows the parsed values).
- **Lobby mode** (`inhouse-*`): Explore shows Red Sail and not Rocka Beach tours.
- **Layout**: tab bar doesn't cover the last card's text, sheet action bar sits at the bottom, the
  desktop top nav is aligned, nothing clipped at 390 px.
- **Admin**: the edited item loads into the form, no red "file not found" dots in the list.

Headless Chromium has no notch, so `env(safe-area-inset-*)` is 0 here: status-bar/notch clearance
and real iOS Safari behaviour still need a look on a physical iPhone (and `node scripts/verify.js`
lints the safe-area CSS).

## 5. Poking around by hand

```sh
python3 -m http.server 8000 --bind 127.0.0.1      # from the repo root (any free port); then open:
```

- `http://127.0.0.1:8000/?nosw=1#/today` — any route from CLAUDE.md works after `#`
- `?time=morning|day|sunset|night|auto` — force the time-of-day look (kept for the browser tab session)
- `?mode=inhouse` / `?mode=offsite` — lobby mode on/off (remembered on that browser)
- `?nosw=1` — unregister the service worker and clear its caches on this browser first
- `http://127.0.0.1:8000/admin.html` — staff editor (password gate)

These parameters are removed from the address bar after load; that's expected. To screenshot a
server you started, pass `--url http://127.0.0.1:8000/` — the script checks it serves this folder
(a server left running from another copy of the repo would show that copy instead).
