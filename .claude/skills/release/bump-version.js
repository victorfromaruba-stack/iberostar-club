#!/usr/bin/env node
/*
 * Set the release number in every place the version rule (CLAUDE.md) names, in one go:
 *
 *   js/app.js     const DATA_VERSION = N
 *   js/admin.js   const DATA_VERSION = N
 *   sw.js         const VERSION = N          (its ?v=${VERSION} template URLs follow automatically)
 *   index.html    every local ?v=N
 *   admin.html    every local ?v=N
 *
 * Usage (from anywhere):
 *   node .claude/skills/release/bump-version.js            # give this release its number (see below)
 *   node .claude/skills/release/bump-version.js 410        # an explicit number (above this copy AND main)
 *   node .claude/skills/release/bump-version.js --check    # show the numbers (here and on main), change nothing
 *   ... --no-fetch                                         # don't run `git fetch origin main` first (offline)
 *   ... --root DIR                                         # work on another copy of the repo
 *
 * The number guests have is the one on GitHub's main branch, so this script first fetches main and
 * reads its js/app.js. Then, without an explicit number:
 *   - this copy is already above main (in sync)  → this release already has its number: nothing changes;
 *   - otherwise                                  → max(this copy, main) + 1.
 * So it is safe to run once per change: it bumps at most once per release, and a rollback (whose
 * `git revert` puts the old number back) or a merge after main moved always lands above main.
 *
 * Git conflicts left by a revert or merge in these five files are settled automatically when they
 * only differ in version numbers (the current side is kept, then the bump overwrites it). Any other
 * conflict there is reported and nothing is written. A kill-switch sw.js (no VERSION, see
 * SKILL.md) is left alone.
 *
 * Exit 0 = done / nothing to do (or, with --check, in sync and above main); 1 = refused, out of
 * sync, or (with --check) not above main yet.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const args = process.argv.slice(2);
const flag = (f) => args.includes(f);
const opt = (f) => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : undefined; };
if (flag('-h') || flag('--help')) {
    console.log('Usage: node .claude/skills/release/bump-version.js [N] [--check] [--no-fetch] [--root DIR]');
    process.exit(0);
}
const root = path.resolve(opt('--root') || path.join(__dirname, '..', '..', '..'));
const rootArg = opt('--root');
const wanted = args.find((a) => /^\d+$/.test(a) && a !== rootArg);
const CHECK = flag('--check');

const EXTERNAL = /^(?:[a-z][a-z0-9+.-]*:)?\/\//i;
const FILES = [
    { rel: 'js/app.js', re: /(\bconst\s+DATA_VERSION\s*=\s*)(\d+)/g, one: true },
    { rel: 'js/admin.js', re: /(\bconst\s+DATA_VERSION\s*=\s*)(\d+)/g, one: true },
    { rel: 'sw.js', re: /(^const\s+VERSION\s*=\s*)(\d+)/gm, one: true },
    { rel: 'index.html', re: /([^\s"'()<>=,`]*[?&]v=)(\d+)/g, html: true },
    { rel: 'admin.html', re: /([^\s"'()<>=,`]*[?&]v=)(\d+)/g, html: true }
];

// ---------------------------------------------------------------- git conflicts
// <<<<<<< ours \n … [||||||| base \n …] ======= \n … >>>>>>> theirs
const CONFLICT = /^<<<<<<< [^\n]*\n([\s\S]*?)(?:^\|\|\|\|\|\|\| [^\n]*\n[\s\S]*?)?^=======\n([\s\S]*?)^>>>>>>> [^\n]*\n/gm;
const VERSION_ANY = /(\bDATA_VERSION\s*=\s*|^const\s+VERSION\s*=\s*|[?&]v=)\d+/gm;
const sameButVersion = (a, b) => a.replace(VERSION_ANY, '$1N') === b.replace(VERSION_ANY, '$1N');
function settleConflicts(rel, src) {
    let settled = 0, other = 0;
    const out = src.replace(CONFLICT, (m, ours, theirs) => {
        if (sameButVersion(ours, theirs)) { settled++; return ours; }
        other++; return m;
    });
    return { out, settled, other, markers: /^(<<<<<<<|>>>>>>>) /m.test(out) };
}

// ---------------------------------------------------------------- main's number
function git(...a) {
    return execFileSync('git', ['-C', root, ...a], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 30000 });
}
function mainVersion() {
    let fetched = false, note = '';
    if (!flag('--no-fetch')) {
        try { git('fetch', '--quiet', 'origin', 'main'); fetched = true; } catch (e) {
            note = `could not fetch origin/main (${String(e.stderr || e.message).trim().split('\n')[0] || 'offline?'}); using the last fetched copy`;
        }
    }
    try {
        const src = git('show', 'origin/main:js/app.js');
        const m = /\bconst\s+DATA_VERSION\s*=\s*(\d+)/.exec(src);
        if (!m) return { v: null, note: 'origin/main:js/app.js has no DATA_VERSION' };
        return { v: +m[1], fetched, note };
    } catch (e) {
        return { v: null, note: note || 'no origin/main in this checkout (not a clone of GitHub?)' };
    }
}

// ---------------------------------------------------------------- read
let problems = 0;
const settledNotes = [];
const state = FILES.map((f) => {
    const abs = path.join(root, f.rel);
    if (!fs.existsSync(abs)) { console.error(`✗ ${f.rel} not found under ${root}`); problems++; return null; }
    let src = fs.readFileSync(abs, 'utf8');
    let dirty = false;
    if (/^<<<<<<< /m.test(src)) {
        const c = settleConflicts(f.rel, src);
        if (c.other || c.markers) {
            console.error(`✗ ${f.rel}: ${c.other || 'a'} git conflict(s) that are not just the version number — resolve them by hand (on version lines keep either number), then run this again`);
            problems++;
            return null;
        } else {
            settledNotes.push(`${f.rel}: ${c.settled} version-only conflict(s) settled`);
            src = c.out; dirty = true;
        }
    }
    const found = [...src.matchAll(f.re)].filter((m) => !(f.html && EXTERNAL.test(m[1])));
    if (f.rel === 'sw.js' && !found.length && /^\/\* KILL SWITCH/.test(src)) {
        return { ...f, abs, src, values: [], kill: true, dirty };
    }
    if (!found.length || (f.one && found.length !== 1)) {
        console.error(`✗ ${f.rel}: expected ${f.one ? 'exactly one' : 'at least one'} version match, found ${found.length}`);
        problems++;
    }
    return { ...f, abs, src, values: found.map((m) => +m[2]), dirty };
});
if (problems) process.exit(1);

const all = state.flatMap((s) => s.values);
const max = Math.max(...all);
const inSync = all.every((v) => v === all[0]);
const main = mainVersion();
const describe = (s) => {
    if (s.kill) return `${s.rel.padEnd(12)} kill switch (no VERSION; left as is)`;
    const u = [...new Set(s.values)];
    return `${s.rel.padEnd(12)} ${u.join(', ')}${s.values.length > 1 ? `  (${s.values.length} refs)` : ''}`;
};
const mainLine = main.v != null
    ? `  ${'main'.padEnd(12)} ${main.v}  (origin/main${main.fetched ? ', fetched just now' : ', last fetched copy'})`
    : `  ${'main'.padEnd(12)} ?  (${main.note})`;
if (main.note && main.v != null) console.error(`⚠ ${main.note}`);

if (CHECK) {
    state.forEach((s) => console.log('  ' + describe(s)));
    console.log(mainLine);
    settledNotes.forEach((n) => console.log(`  (would settle) ${n}`));
    if (!inSync) {
        console.log(`✗ out of sync (highest ${max}) — run this script without --check to set them all to one number`);
        process.exit(1);
    }
    if (main.v == null) { console.log(`✓ in sync at ${all[0]} (could not compare with main)`); process.exit(0); }
    if (all[0] > main.v) { console.log(`✓ in sync at ${all[0]}, above main's ${main.v}: this release has its number`); process.exit(0); }
    console.log(`✗ in sync at ${all[0]}, but not above main's ${main.v} — run this script without --check before releasing`);
    process.exit(1);
}

// ---------------------------------------------------------------- decide
const floor = Math.max(max, main.v != null ? main.v : -Infinity);
if (!wanted && inSync && main.v != null && max > main.v) {
    // Write back any settled conflicts (numbers unchanged) and stop: this release already has its number.
    state.filter((s) => s.dirty).forEach((s) => fs.writeFileSync(s.abs, s.src));
    settledNotes.forEach((n) => console.log(`  ${n}`));
    console.log(`✓ already bumped: ${max} is above main's ${main.v}, so this release has its number. Nothing changed.`);
    process.exit(0);
}
const next = wanted ? +wanted : floor + 1;
if (!(next > floor)) {
    console.error(`✗ refusing ${next}: it must be higher than ${max === floor ? 'this copy\'s' : 'main\'s'} ${floor}`
        + `${main.v != null && max !== floor ? ` (this copy: ${max})` : ''}. Numbers only move forward, even for a rollback.`);
    process.exit(1);
}
if (main.v == null) console.error(`⚠ ${main.note} — numbered from this copy only; check main's number before releasing`);

for (const s of state) {
    settledNotes.filter((n) => n.startsWith(s.rel + ':')).forEach((n) => console.log(`  ${n}`));
    if (s.kill) { if (s.dirty) fs.writeFileSync(s.abs, s.src); console.log(`  ${s.rel.padEnd(12)} kill switch: left as is`); continue; }
    const out = s.src.replace(s.re, (m, pre) => (s.html && EXTERNAL.test(pre) ? m : pre + next));
    fs.writeFileSync(s.abs, out);
    console.log(`  ${s.rel.padEnd(12)} ${[...new Set(s.values)].join(', ')} → ${next}${s.values.length > 1 ? `  (${s.values.length} refs)` : ''}`);
}
console.log(`✓ release version is now ${next}${main.v != null ? ` (main has ${main.v})` : ''}${inSync ? '' : '; was out of sync, now consistent'}.`
    + `${settledNotes.length ? ' Mark the conflicted files resolved with git add.' : ''} Next: node scripts/verify.js`);
