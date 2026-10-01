---
name: release
description: Use when shipping changes to the live Iberostar Aruba guest site on GitHub Pages — "put the site live", "publish the changes", "deploy", "push it to the website", "make the new menu live", "release this", "undo the last update", "roll it back", or when guests still see the old version after a change. Covers the version bump, image build, verify.js, commit, pushing or merging to main, confirming the deploy, what guests see afterwards ("Updated info available"), rolling back, and the ?nosw=1 / kill-switch escape hatches.
---

# Release to the live site

The site is static and served by GitHub Pages from the **`main`** branch of
`victorfromaruba-stack/iberostar-club` at <https://victorfromaruba-stack.github.io/iberostar-club/>
(every push to `main` runs the "pages build and deployment" workflow, usually 1–2 minutes). A
service worker caches the app on guests' phones, so **a change only reaches returning guests if the
release number moves above the one already live** — that is the version rule in CLAUDE.md, and the
reason for step 1.

Pushing to `main` publishes to every guest. Do it when the owner has asked to publish; if they only
asked for a change, finish steps 1–4 and ask before step 5. Run every command from the repo root.

## 0. Know what is in the working tree

```sh
git status
```

Everything listed either goes into the release commit or can block step 5 (`git switch main`
aborts when an uncommitted file differs on main). Decide for each file: part of this release, a separate commit, or
not yours (ask the owner; don't sweep it in). Project docs — `CLAUDE.md` and `.claude/` (these
skills) — can be committed with the release or on their own and never need a bump. Anything on
`main` is publicly downloadable from the site (CLAUDE.md already is), so never put passwords or
keys in the repo, docs included.

## 1. Give the release its number

`DATA_VERSION` in `js/app.js` and `js/admin.js`, `VERSION` in `sw.js`, and every `?v=` in
`index.html` and `admin.html` must be the same number, and it must be **above main's** (what guests
have). One command handles both:

```sh
node .claude/skills/release/bump-version.js            # fetches main; bumps to max(here, main) + 1 — or says "already bumped"
node .claude/skills/release/bump-version.js --check    # show the numbers here and on main, change nothing
node .claude/skills/release/bump-version.js 410        # a specific number (must be above here and main)
```

It bumps at most once per release: when this checkout is already above main (an earlier change in
the same unreleased batch was bumped) it changes nothing. After a revert, a merge or a rebase it
always lands above main, so a fix never ships under a number guests already have. `--no-fetch`
skips the `git fetch` when offline (it then trusts the last fetched `origin/main`, and says so).

Bump whenever anything served to guests changed: `js/`, `css/`, `index.html`, `admin.html`,
`qr.html` (precached by the service worker), `sw.js`, `manifest.webmanifest`, or anything under
`assets/` (new photos change `js/media.js`). Only docs, `scripts/` or `.claude/` changed → no bump
needed. (`manifest.webmanifest` and `qr.html` carry their own icon `?v=`; those are not part of the
rule and the script leaves them alone.)

## 2. Rebuild images if media changed

If any photo, logo, PDF or video was added, replaced or removed:

```sh
python3 scripts/build-images.py
```

It needs Python 3.9+ and Pillow ≥ 10 (if it stops with "needs Pillow >= 10":
`python3 -m pip install Pillow`, or a venv as in the add-content skill). Exit 1 means an `ERROR`
(unreadable file) or `MISSING` (path in `data.js` not on disk) line: fix it before releasing.
`low-res` lists every soft hero photo in the catalog (about 11 older ones today) — it only needs
action for a photo added in this release. `brand … (written)` lines are normal. Commit everything
`git status` then lists: new or removed originals, `assets/img/`, `js/media.js`, and `index.html` if
`HERO_PRELOAD` had to change (verify.js tells you).

## 3. Verify — must pass

```sh
node scripts/verify.js
```

It must end with **"All checks passed."** (exit 0). Warnings (⚠) don't block; any ✗ does — fix it
and run again. For a content change, `node .claude/skills/add-content/check-item.js <Key>` and a
look with the **preview** skill are worth the minute.

## 4. Commit

```sh
git status                      # only the files you meant to change?
git diff --stat
git add js/data.js js/media.js assets/ …     # name the files; `git add -A` only if step 0 showed nothing else
git commit -m "Add Casa Mar to Dine with photos, menu and dinner hours" -m "Release 401."
git status                      # must now say "nothing to commit, working tree clean"
```

Describe what guests will notice, not "Update data.js". Add the attribution lines your session
asks for, if any. Never commit secrets or files from outside the repo.

## 5. Push to `main`

**Already on `main`:** `git push origin main`.

**On a feature branch, merging locally** (the working tree must be clean):
```sh
git push -u origin <branch>
git switch main && git pull --ff-only origin main
git merge --ff-only <branch>
git push origin main
```
If `git merge --ff-only` refuses ("Not possible to fast-forward"), main has moved: run
`git merge <branch>`, then `node .claude/skills/release/bump-version.js` — it settles conflicts that
differ only in version numbers and lands above main; if it names other conflicts, resolve those by
hand and run it again. Then `git add -A`, `node scripts/verify.js`, `git commit`, push. A merge that
went through cleanly still needs that bump: two releases can both have picked the same next number.

**Through a pull request:**
```sh
git push -u origin <branch>
gh pr create --base main --fill
node .claude/skills/release/bump-version.js --check    # right before merging: must say "above main's N"
gh pr merge <number> --merge          # a merge commit: keeps your branch in line with main
git switch main && git pull --ff-only origin main
```
If `--check` says "not above main" (another release got in first — GitHub may still call the pull
request mergeable, because both releases changed the version lines the same way), run
`git merge origin/main`, `bump-version.js`, verify, commit, push, and only then merge.

Don't use squash or rebase merges here: they leave your branch out of line with main and the next
local merge fails. If GitHub reports a conflict, merge `origin/main` into the branch as above
(merge, bump, verify, commit, push) and the pull request updates.

Start the next piece of work from the updated `main` (or `git merge --ff-only origin/main` on your
branch).

## 6. Confirm the deploy

```sh
sh .claude/skills/release/check-live.sh
```

It fetches `origin/main` and prints: the local release, HEAD and `origin/main`; the number the live
`sw.js` and `js/app.js` serve (with a cache-buster, so the 10-minute Pages CDN cache can't fool
you); and the latest Pages deploy run with its **run id** and commit. It ends:

- `LIVE` (exit 0) — your HEAD's files are what `main` holds, the latest deploy is for main's
  current commit and succeeded, and the live files carry this release (or the kill switch).
- `NOT YET` (exit 1) — re-run every ~30 s; Pages usually takes 1–2 minutes. If it says your HEAD
  differs from `origin/main`, your commit is not on main yet (push/merge it), or main has newer
  commits (`git switch main && git pull --ff-only origin main`, run again).
- `FAILED` (exit 2) — the deploy run failed; it prints `gh run view <id> -R victorfromaruba-stack/iberostar-club --log-failed` to see why.

Without the `gh` CLI it says so and only compares numbers. Then open the live site once
(`…/iberostar-club/?nosw=1` gives a clean look on your machine) and check the thing you changed.

## What guests see

- **New visitors** get the new release immediately.
- **Returning guests** (browser or Home Screen app): the phone checks `sw.js` when the app is
  opened, and while it is open or when it comes back to the foreground at most once every 30
  minutes. The new release downloads in the background, then:
  - if the page they have open already runs the new files, it switches over silently;
  - otherwise a toast **"Updated info available · Refresh"** shows for 5 s (once more on the next
    tab switch or return to the app). Refresh reloads into the new release; if they ignore it, they
    get it the next time the app is fully closed and reopened.
- Guests offline keep the last release they had until they are back online.
- The Pages CDN may serve the previous file for up to 10 minutes after the deploy finishes.

(Verified locally: after a bump, an open page shows the toast and Refresh lands on the new number.
A fix shipped under a number guests already have shows **no** toast — that is why step 1 always
goes above main.)

## Rollback

Undo the bad change with a new commit on `main` — never by force-pushing old history:

```sh
git status                                         # must be clean
git switch main && git pull --ff-only origin main
git log --oneline -10                              # find the bad commit(s)
git revert --no-commit <sha>                       # several: list them, newest first
node .claude/skills/release/bump-version.js        # settles version-only conflicts, lands above main
git status                                         # any file still "both modified"? fix it by hand, run the bump again
python3 scripts/build-images.py                    # if the bad commit touched photos
node scripts/verify.js
git add -A && git commit -m "Roll back <what guests will notice>" -m "Release <N>."
git push origin main && sh .claude/skills/release/check-live.sh
```

- `git revert` stops with "is a merge but no -m option was given" when the bad change came in as a
  pull-request merge commit: use `git revert --no-commit -m 1 <sha>`.
- Conflicts are normal when later releases exist: every one of them changed the version lines.
  `bump-version.js` settles conflicts that differ only in version numbers; any other conflict it
  names must be resolved by hand (keep the later releases' content, drop the bad change).
- The revert puts the broken release's old number back; the bump takes it above main again, so
  phones see a new release and show the toast.

## Escape hatches (from CLAUDE.md)

- **One device stuck or broken** (old version, odd caching): open
  `https://victorfromaruba-stack.github.io/iberostar-club/?nosw=1` on that device. It unregisters the
  service worker and deletes the `ib-*` caches for that browser; reload once more and it starts
  fresh. An iPhone Home Screen icon may keep its own storage — if it is still stuck, delete the
  icon and add it again.
- **Every device — kill switch** (a broken service worker you can't otherwise reach). In this
  order: bump, then replace `sw.js` with the snippet from its own header comment, verify, commit,
  push:
  ```sh
  node .claude/skills/release/bump-version.js
  node -e "const fs=require('fs');const s=fs.readFileSync('sw.js','utf8');const m=/ \*       (self\.addEventListener\('install'[\s\S]*?\}\)\(\)\)\);)/.exec(s);if(!m)throw new Error('kill-switch snippet not found in sw.js header');fs.writeFileSync('sw.js','/* KILL SWITCH: unregisters the service worker and deletes ib-* caches on every device. */\n'+m[1].replace(/^ \*       /gm,'')+'\n')"
  node scripts/verify.js     # expect "1 problem": sw.js: could not find `const VERSION = <n>`
  ```
  That ✗ is expected for this emergency release only. `bump-version.js` and `check-live.sh`
  recognise the kill-switch `sw.js` (first line `/* KILL SWITCH`): `check-live.sh` says `LIVE` once
  the live `sw.js` is the kill switch and `js/app.js` has the new number. Each device picks it up
  on its next visit: the worker unregisters itself, deletes every `ib-*` cache and reloads open tabs
  from the network (the app keeps working, just without offline support). Leave it live for a few
  weeks. To restore later: `git checkout <last good commit> -- sw.js`, `bump-version.js` (lands
  above main), verify, release.

## Checklist

- [ ] Owner asked to publish (or confirmed); `git status` understood, nothing unrelated swept in
- [ ] `bump-version.js` ran; `--check` says "above main's N"
- [ ] `build-images.py` ran if any media changed (no `ERROR`/`MISSING`); its outputs staged
- [ ] `node scripts/verify.js` → "All checks passed."
- [ ] Descriptive commit; working tree clean; pushed to (or merged into) `main`
- [ ] `check-live.sh` says `LIVE`, and the change looks right on the live site
