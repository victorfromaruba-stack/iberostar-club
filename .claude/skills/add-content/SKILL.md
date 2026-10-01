---
name: add-content
description: Use when adding, changing, hiding or removing anything guests see in the Iberostar Aruba app — a new restaurant, bar, tour/excursion, spa treatment, golf item, shop or resort; new or replacement photos (including iPhone HEIC files); a new or updated menu PDF; changed prices, times, opening hours, itinerary or what-to-bring; marking something "coming soon"; or taking an item down. Covers requests like "add a new restaurant", "update the menu", "change the price of the sunset cruise", "add these photos to Marea", "put the new hotel as coming soon", "remove the go-kart tour".
---

# Add, update or remove catalog content

All guest content is one object, `const defaultData = {…}` in `js/data.js`. The app derives cards,
filters, prices, open/closed status, search and Today picks from it with the parsers in
`js/lib.js`, so the *format* of each field matters as much as the content. Work through the steps
below in order; the checklist at the end is the short version. **Run every command from the repo
root.** `<Key>` below stands for the item's key; `CasaMar` is the fictional worked example at the end.

## 0. Never invent content

Only publish what staff supplied or confirmed. If a value is missing, **leave the field out** and
ask — never fill in hours, prices, phone/WhatsApp numbers, booking links, addresses, menus or
"award-winning"-style claims from memory or a partner's website. Two derived defaults also make a
claim, so ask about them explicitly:

- **IberoCash** — every non-resort, non-coming-soon, non-complimentary item shows "IberoCash
  accepted" unless it has `"iberocash": false`. Not confirmed → set `"iberocash": false`.
- **Lobby (in-house) vs off-site** — tours with no `channel` show in both modes (see `channel`).

## 1. Decide type, key and folder

| Guest finds it in | `type` | goes under | photos folder | file names |
|---|---|---|---|---|
| Resorts (Today rail, `#/resorts`) | `club` | `// CLUBS` | `assets/Hotels/<Name>/` | `hotel_<name>_N.jpg` |
| Dine | `food` | `// FOOD` | `assets/Restaurants/<Name>/` | `rest_<name>_N.jpg`, `menu_<name>[_<label>].pdf` |
| Explore → tours | `fun` | `// FUN` | `assets/Activities/<Partner>/` (shared by all that partner's tours) | `act_<name>_N.jpg` |
| Explore → Golf & nature | `golf` | `// GOLF` | `assets/Golf/<Name>/` | `golf_<name>_N.jpg` |
| Spa | `spa` | `// SPA` | `assets/Spa/<Name>/` | `spa_<name>_N.jpg` |
| Explore → Shopping | `store` | `// STORE` | `assets/Store/<Name>/` | `store_<name>_N.jpg` |

- **Key** (`"CasaMar": {…}`): short CamelCase, letters/digits/`-`/`_` only, unique. It becomes the
  URL `#/item/<Key>` and is stored in guests' Saved lists — **never rename an existing key**.
- New folders: no `_` at the start (GitHub Pages drops them), avoid spaces/apostrophes, and use
  the exact same case in `data.js` as on disk (Pages is case-sensitive; macOS is not).
- Tour operator logos live in `assets/Logos/logo_<partner>.png` and go in `partnerLogo`.

## 2. Photos, logos, menus

1. Convert and name the photos in one go (rotates upright, sRGB, long edge ≤ 2400 px, strips GPS
   metadata, never overwrites, continues numbering after existing files). `--out` is always taken
   inside the repo, and the script ends by printing the paths to paste into `gallery`:
   ```sh
   python3 .claude/skills/add-content/to_jpg.py ~/Downloads/casamar/ --out assets/Restaurants/CasaMar --prefix rest_casamar
   ```
   iPhone `.HEIC` needs `python3 -m pip install pillow-heif` once (the script says so if missing).
   If pip refuses ("externally-managed-environment"), use a throwaway venv:
   `python3 -m venv /tmp/ib-venv && /tmp/ib-venv/bin/pip install pillow pillow-heif`, then run the
   script with `/tmp/ib-venv/bin/python`. Or staff export from Photos as JPEG and you run the
   script on the JPEGs.
2. **Hero = `gallery[0]`**: the best landscape *photo*, ideally ≥ 1600 px wide and never under
   800 px (it looks soft full-width). Never a logo, a menu or a text graphic. Narrower photos are
   fine further down the gallery; the script marks them "not as the hero".
3. **Logos / wordmarks** stay PNG (transparent), copied as-is to `<folder>/<prefix>_logo.png`, and
   go in `"logo"` — never in `gallery`.
4. **Menus** are PDFs. When *replacing* one, use a new file name (e.g. `menu_marea_drinks_2026-10.pdf`)
   and delete the old file: the service worker serves PDFs stale-while-revalidate, so a same-name
   replacement shows the old menu once to returning guests.

## 3. Edit `js/data.js`

Put the entry under its `// SECTION` comment, in the file's JSON style (double-quoted keys and
strings, 4-space indent, comma between entries). Required: `type`, `title`, `sub`, `desc`,
`gallery` (use `[]` when there are no photos yet). Everything else is optional — omit it rather
than leaving `""`.

| Field | Format the app understands | Example from the catalog |
|---|---|---|
| `sub` | Resorts: the location. Our own restaurants: `Joia Aruba • <cuisine>`. Partner restaurants: just the cuisine. Tours: the partner, optionally `• <boat/operator>` — the part before `•` (U+2022, with spaces) is the partner shown on cards and the request ticket. | `"Eagle Beach"`, `"Joia Aruba • Caribbean"`, `"Seafood"`, `"Rocka Beach Tours • Tropical Sailing Aruba"` |
| `desc` | Plain sentences; HTML allowed. **Prices go in a price-box at the end** (below). | |
| `gallery` | Array of photo paths, hero first. Gaps in numbering are fine. | `["assets/Restaurants/Marea/rest_marea_1.jpg", …]` |
| `logo` / `partnerLogo` | Path to a logo file. | `"assets/Logos/logo_rocka.png"` |
| `pdf` or `pdfs` | One menu, or several with labels. | `"pdfs": [{ "label": "Drinks Menu", "url": "assets/…/menu_marea_drinks.pdf" }]` |
| `duration` | Number + `Hours`/`Minutes`; ranges with `-` or `or`. Drives "4 h" and the Half-day (≤ 4.5 h) / Full-day (≥ 5 h) chips. | `"4 Hours"`, `"5-7 Hours"`, `"4 or 8 Hours"`, `"50 Minutes"` |
| `time` | Departure/session times (tours, golf) — see *Times and hours* below. | |
| `hours` | Opening hours (restaurants) — see *Times and hours* below. **Only real hours from staff.** | |
| `itinerary` | Array, **one stop per entry**. | `["Black Stone Beach", "3 Bridges"]` |
| `essentials` | Array, **one per entry**, auto-grouped: starts `Optional`/`+$` or says add-on → Add-ons; says included/provided → Included; required/must/minimum/license/accompanied/arrive/age/notify/private charter → Good to know; anything else → Bring. | `["Sunblock", "Snorkel gear provided", "Optional: +$20 for lunch"]` |
| `area` | One of `joia`, `tierra`, `partner`, `island` (default from `sub`; food → partner, tours → island). | `"area": "joia"` |
| `cuisine` | Reuse an existing spelling so Dine can group them: Italian, Seafood, Steakhouse, Caribbean, Pizzeria, Asian fusion, French fusion, Tapas, Open-air grill, Rooftop bar, Bagels & burgers. | |
| `meals` | Subset of `breakfast`, `lunch`, `dinner`, `drinks` (default: bar/rooftop → drinks, bagel/breakfast → breakfast+lunch, else dinner). | `["drinks"]` |
| `channel` | Tours: `in-house` (Red Sail, lobby iPads), `off-site` (Rocka Beach) or `both`. Default from `sub`: "Red Sail" → in-house, "Rocka" → off-site, else both. | `"channel": "off-site"` |
| `status` | `"coming-soon"` (see §7). | |
| `iberocash` | `true`/`false` — see §0. | `"iberocash": false` |
| `phone`, `whatsapp`, `bookUrl`, `address`, `bookingNote` | Verified values only. `phone` E.164 (`+297…`), `whatsapp` digits only with country code, `bookUrl` full `https://` URL. The main button becomes Book online / Reserve on WhatsApp / Call to reserve (in that order of preference); `address` adds Directions. | |
| `featured`, `tags`, `order`, `priceFrom` | Rarely needed: `featured` boosts Today picks in `morning`/`day`/`sunset`/`night`; `tags` adds filter tags the text doesn't imply; `priceFrom` (a number) overrides the parsed From price. | |

**Times and hours** (copy the shape exactly):

- `time` — one string; several slots separated by a pipe or the word `or`; each slot may start with
  a `Label:`; clock times like `9:30 AM`, `2:30–6:30 PM`, `7am - 2pm` or `17:00`; extra notes in
  parentheses. A `Pickup:` label is shown as "Pickup", golf as "Tee times". Examples from the catalog:
  ```
  "time": "Morning: 9:30 AM–1:30 PM | Afternoon: 2:30–6:30 PM"
  "time": "Pickup: 8:15–8:30 AM (Highrise) | 8:30–8:45 AM (Lowrise)"
  "time": "9:00 AM – 12:00 PM or 4:00 PM – 7:00 PM"
  ```
- `hours` — an array, one line per rule, 24-hour clock, plain hyphen, optional label and day range:
  `"[Label] HH:MM-HH:MM [Day[-Day]]"` or `"[Label] from HH:MM"`. Labels such as Breakfast, Brunch,
  Lunch, Dinner, Bar or Daily also feed the meal filters; `18:00-01:00` (past midnight) is fine.
  ```
  "hours": ["Dinner 18:00-22:30 Tue-Sun"]
  "hours": ["Lunch 11:00-17:00 Mon-Sat", "Bar from 17:00"]
  ```
  These give the card's "Open now · until 10:30 PM" / "Opens 6 PM" line; Dine adds an "Open now"
  chip once three or more restaurants have hours. (`6pm-10:30pm` does not parse — use 24-hour.)

**Price-box markup** — exactly this shape, appended to `desc` (inside the JS string the quotes are
escaped as `\"`):

```html
… description text. <div class="price-box"><div class="price-row"><span>Adult</span><strong>$75.00</strong></div><div class="price-row"><span>Child (4-12)</span><strong>$50.00</strong></div></div>
```

One price per row (`$50–$80` in one row parses as 5080). Every row is listed under **Prices** in the
detail sheet (labels starting `Add-on` go in an Add-ons sub-list). The lowest row is the item's
"From" price — ignoring rows whose label starts with `Add-on`/`Optional`/`Extra`/`Each additional`,
and child/kid rows when adult rows exist; a label containing "Per Hour" shows "/hr". Where "From"
shows depends on the type:

- **Tours** (`fun`): on the card ("From $75"), in the facts strip and in search results.
- **Spa**: in the facts strip ("Price: From $X"); not on the card.
- **Restaurants and the rest**: not on the card or in the facts strip — only in the concierge
  request and saved-list tickets.

The **Under $100** and **Kids** filter chips exist only on Explore (tours, golf, shops): any Explore
item with a From price under $100 matches Under $100; a child row on a tour or golf item adds Kids.
(`check-item.js` lists `under100` for a cheap restaurant too — harmless, Dine has no such chip.)

**Staff used the admin page instead?** If they send a `data.js` downloaded from `admin.html`,
replace `js/data.js` with it, read `git diff js/data.js` to confirm only the intended items changed
(the export reproduces the file byte for byte, so the diff shows only their edits), then continue
from step 4.

## 4. Check how the app reads it

```sh
node .claude/skills/add-content/check-item.js <Key>        # full read-out for one or more keys
node .claude/skills/add-content/check-item.js              # every item, warnings only
```

It runs the app's own parsers and prints the card line, facts strip, parsed prices and where the
"From" price shows, duration/time/hours (with the card's open/closed line right now), essentials
groups, tags, channel, IberoCash and photo status. Fix every `⚠ WARN` (wrong section, price rows
that don't parse, two prices in one row, unparsed duration/hours, logo in gallery, missing or
wrong-case files, unknown field names). Read the `note` lines too — e.g. a time "shown as typed"
may be fine, an unconfirmed IberoCash line is not.

## 5. Build images, bump the version, verify

```sh
python3 scripts/build-images.py                    # after editing data.js: it reads data.js
node .claude/skills/release/bump-version.js        # gives this release its number (once; see below)
node scripts/verify.js                             # must end "All checks passed."
```

`build-images.py` (needs Pillow ≥ 10) writes WebP derivatives into `assets/img/` and updates
`js/media.js`; it is idempotent and also prunes derivatives nothing references. Read its summary:

- `ERROR` (unreadable file, e.g. HEIC) or `MISSING` (path in data.js not on disk): fix it — the
  script exits 1.
- `low-res`: it lists **every** soft hero in the catalog (about 11 older ones today). Act only on a
  line naming a photo you just added; ask staff for a larger original or put a wider photo first.
- `brand … (written)` lines are normal (the check is date-based); `git status` shows whether any
  file really changed.

All of it belongs in the release commit: the new originals, `assets/img/`, `js/media.js`, `js/data.js` — whatever `git status` lists.

`bump-version.js` fetches GitHub's `main` and only bumps when this checkout is not already above
main's number, so running it after every change is safe: the first run of a release bumps, later
runs say "already bumped". Use `--check` to see the numbers.

## 6. Look at it

Use the **preview** skill (run `node .claude/skills/preview/preview.js --check` first; if it says
Playwright is not found, follow that skill's step 1). For the new item, phone, day and night — use
`explore` instead of `dine` for a tour, golf or shop item, `spa` for a spa item:

```sh
node .claude/skills/preview/preview.js --item <Key> --only dine,card,search,detail,lightbox --devices phone --times day,night --full --out <scratch>/ib-preview
```

`card-<Key>` is the card as it sits in its tab (photo loaded), `search-<Key>` searches its title
and is ✗ if the item is not listed, `detail-<Key>` and `lightbox-<Key>` are the sheet and photos;
`--full` makes `dine` the whole page. Check: the hero is a real photo (not a logo or the IBEROSTAR
placeholder), the logo tile on the sheet, the price list (and "From $" on a tour card),
times/hours ("Opens 6 PM"), the menu button, essentials groups. A "no WebP yet" note means
`build-images.py` has not run since the photo was added. Then publish with the **release** skill.

## 7. Coming soon, and removing an item

**Coming soon:** set `"status": "coming-soon"` and a `sub` of `"Coming Soon"` (or `"In Development"`,
which changes the label). `gallery` may be `[]`; with a `logo` the placeholder shows it. Coming-soon
items sit at the end of their section without a save button or IberoCash line and never appear in
Today picks. To launch it, remove `status`, set the real `sub`, add photos — then steps 4–6.

**Remove** (e.g. "remove the go-kart tour" → key `GoKart`):
1. **Before** touching `data.js`, list what the item uses:
   ```sh
   node .claude/skills/add-content/check-item.js --files <Key>
   ```
   Each file is marked `delete` (nothing else uses it) or `keep` (another item, or the app's code,
   uses it — e.g. the Rocka Beach logo, or Zima's photo that is the Today hero). For a folder only
   this item uses it says to delete the whole folder; for a shared one (all Rocka Beach tours share
   `assets/Activities/Rockabeach/`) it says to keep the folder, and `delete?` marks unlisted files
   named like this item's (old photos of it). `code` lines mean the app treats the key specially
   (`SpaPromo`, `SpaMain`): removing it is a code change — ask first.
2. Delete the whole `"Key": { … },` block (keep the commas valid), then the files marked `delete`.
3. `python3 scripts/build-images.py` (prunes their derivatives), `node .claude/skills/release/bump-version.js`
   (bumps only if this release has no number yet), `node scripts/verify.js`.

Guests who saved it simply lose it from Saved; an old shared link shows "That item is no longer
available." There is no "hidden" flag — to pause an item, remove it and keep the photos.

## Worked example (fictional — every value stands for something staff supplied)

Staff send: partner restaurant "Casa Mar", seafood, 3 photos (one HEIC), a PNG logo, a menu PDF, dinner
18:00–22:30 Tuesday to Sunday, IberoCash not confirmed.

```sh
python3 -m pip install pillow-heif     # once, for the HEIC photos
python3 .claude/skills/add-content/to_jpg.py IMG_0001.HEIC IMG_1203.JPG IMG_1204.JPG \
    --out assets/Restaurants/CasaMar --prefix rest_casamar
#   IMG_0001.HEIC -> assets/Restaurants/CasaMar/rest_casamar_1.jpg  1905x1090  377 KB …
cp logo.png assets/Restaurants/CasaMar/rest_casamar_logo.png
cp menu.pdf assets/Restaurants/CasaMar/menu_casamar.pdf
```

Under `// FOOD` in `js/data.js`:

```json
    "CasaMar": {
        "type": "food",
        "title": "Casa Mar",
        "sub": "Seafood",
        "area": "partner",
        "cuisine": "Seafood",
        "hours": ["Dinner 18:00-22:30 Tue-Sun"],
        "iberocash": false,
        "desc": "Fresh catch of the day, grilled over charcoal on a terrace by the water.",
        "gallery": [
            "assets/Restaurants/CasaMar/rest_casamar_1.jpg",
            "assets/Restaurants/CasaMar/rest_casamar_2.jpg",
            "assets/Restaurants/CasaMar/rest_casamar_3.jpg"
        ],
        "logo": "assets/Restaurants/CasaMar/rest_casamar_logo.png",
        "pdfs": [
            { "label": "Menu", "url": "assets/Restaurants/CasaMar/menu_casamar.pdf" }
        ]
    },
```

A tour adds the timed fields (under `// FUN`):

```json
        "sub": "Example Tours",
        "channel": "off-site",
        "desc": "Snorkel two reefs with a guide. <div class=\"price-box\"><div class=\"price-row\"><span>Adult</span><strong>$75.00</strong></div><div class=\"price-row\"><span>Child (4-12)</span><strong>$50.00</strong></div><div class=\"price-row\"><span>Add-on: Lunch</span><strong>$20.00</strong></div></div>",
        "partnerLogo": "assets/Logos/logo_example.png",
        "duration": "3 Hours",
        "time": "Morning: 9:00 AM–12:00 PM | Afternoon: 1:30–4:30 PM",
        "itinerary": ["Boca Catalina", "Antilla wreck (pass by)"],
        "essentials": ["Swimwear and a towel", "Snorkel gear provided", "Optional: +$20 for lunch", "Minimum age: 4"]
```

`check-item.js` then reads them back as: Casa Mar card `Off-site · Seafood | Dinner · Menu`, hours
parsed (card line "Opens 6 PM" before 18:00), IberoCash line hidden; the tour card
`Example · Snorkel | 3 h · 9 AM or 1:30 PM | From $75`, tags `water, snorkel, kids, halfday,
under100`, essentials grouped Bring / Included / Add-ons / Good to know, and a note that the
IberoCash line shows until `iberocash` is confirmed. Then build images, bump, verify, preview, release.

## Checklist

- [ ] Every fact came from staff; unknowns left out; IberoCash and lobby/off-site asked about
- [ ] Right `type`, entry under the matching `// SECTION`, key never used before (and not renamed)
- [ ] Photos converted with `to_jpg.py`, hero = best landscape photo ≥ 800 px, logos only in `logo`
- [ ] Prices in price-box rows, one number per row; duration/time/hours in the formats above
- [ ] `itinerary` / `essentials` are arrays, one entry each
- [ ] `check-item.js <Key>` shows no `⚠ WARN` (removal: `check-item.js --files <Key>` ran first)
- [ ] `python3 scripts/build-images.py` ran with no `ERROR`/`MISSING`; new originals, `assets/img/` and `js/media.js` in the commit
- [ ] `bump-version.js` ran (bumped, or "already bumped"); `node scripts/verify.js` → "All checks passed."
- [ ] Previewed card, search, sheet and photos on phone, day and night; then shipped with the **release** skill
