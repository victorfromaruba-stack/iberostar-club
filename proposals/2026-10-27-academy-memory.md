# Memory suggestions, academy, 2026-10-27

- `lint_content.js` reads the BUILT `academy/index.html`, not the sources. It evals the bundle in a vm, so any check about content must go through the `LEVELS`, `UNITS`, `SCRIPT` globals it pulls out. `LEVEL_IDS` and `ORDER` are read by regex from the source text.
- Before 2026-10-27 nothing checked that a `WATCH(...)` clip or a note's `watch: {vid,from,to}` had its mp4 in `academy/video/clips/`. `cutSrc` in `app.js` just builds `video/clips/<vid>-<from>-<to>.mp4`, so a mistyped second meant a dead player and a green build. (Check added on the night branch; see the report.)
- Clip files are named by their exact second range. Changing a `from`/`to` in a lesson means cutting a new file; the old one then becomes an orphan. At the time of writing: 10 distinct clips referenced, 10 files, none missing, none orphaned. Some clips are reused (zp-uEN9GZ3A 79-101 is in r7 and t2a).
- `build.py --out` can write the page somewhere other than `academy/index.html`, so lint paths about media should be resolved from the script's folder, not from the html's.
- A night agent on the sandbox cannot run node or python at all (every command needs approval), so anything it writes in lint/build is unverified until a person or the primary runs `python3 academy/src/build.py --page`.
