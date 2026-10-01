#!/usr/bin/env node
/*
 * Show how the guest app will read catalog items, using the app's own parsers (js/lib.js), and flag
 * the mistakes verify.js does not catch: price rows that don't parse, times/durations shown as raw
 * text, an entry under the wrong // SECTION, a logo in gallery, a soft hero photo, a derived
 * "IberoCash accepted" line nobody confirmed.
 *
 *   node .claude/skills/add-content/check-item.js              # one line per item (+ its warnings)
 *   node .claude/skills/add-content/check-item.js Marea UTV    # full read-out for these keys
 *   node .claude/skills/add-content/check-item.js --files UTV  # before removing an item: which of its
 *                                                              # files can go, which are shared
 *   node .claude/skills/add-content/check-item.js --root DIR   # check another copy of the repo
 *
 * Exit 0 = no warnings for the items shown, 1 = warnings, 2 = data.js could not be loaded or a key
 * does not exist. It never writes anything.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const ri = args.indexOf('--root');
const ROOT = path.resolve(ri >= 0 ? args[ri + 1] : path.join(__dirname, '..', '..', '..'));
const keysWanted = args.filter((a, i) => !a.startsWith('--') && !(ri >= 0 && i === ri + 1));

function loadGlobal(rel, name) {
    const abs = path.join(ROOT, rel);
    if (!fs.existsSync(abs)) return null;
    const g = {};
    new Function('g', fs.readFileSync(abs, 'utf8').replace(`const ${name}`, `g.${name}`))(g);
    return g[name];
}
let data, MEDIA;
try { data = loadGlobal('js/data.js', 'defaultData'); } catch (e) { console.error(`✗ js/data.js does not load: ${e.message}`); process.exit(2); }
if (!data) { console.error(`✗ js/data.js not found under ${ROOT}`); process.exit(2); }
try { MEDIA = loadGlobal('js/media.js', 'MEDIA'); } catch (e) { MEDIA = null; }
// Run js/lib.js as the browser does (a classic script) and pick the helpers we need from its scope.
const L = require('vm').runInNewContext(fs.readFileSync(path.join(ROOT, 'js', 'lib.js'), 'utf8')
    + '\n;({ buildFacets, facet, cardMeta, factsOf, fromText, classifyEssential, essentialGroupTitle })', { console });
L.buildFacets(data);

// Which // SECTION comment each top-level key sits under.
const SECTION_FOR = { club: 'CLUBS', golf: 'GOLF', store: 'STORE', fun: 'FUN', spa: 'SPA', food: 'FOOD' };
const sectionOf = {};
let sec = '';
fs.readFileSync(path.join(ROOT, 'js', 'data.js'), 'utf8').split('\n').forEach((line) => {
    const s = /^\s*\/\/\s*(CLUBS|GOLF|STORE|FUN|SPA|FOOD)\b/.exec(line);
    if (s) { sec = s[1]; return; }
    const k = /^\s{1,4}"([^"]+)"\s*:\s*\{/.exec(line);
    if (k && !(k[1] in sectionOf)) sectionOf[k[1]] = sec;
});

const KNOWN = new Set(['type', 'title', 'sub', 'desc', 'gallery', 'video', 'pdf', 'pdfs', 'partnerLogo', 'duration', 'time',
    'itinerary', 'essentials', 'logo', 'area', 'cuisine', 'meals', 'hours', 'tags', 'priceFrom', 'phone', 'whatsapp', 'bookUrl',
    'bookingNote', 'address', 'channel', 'featured', 'status', 'iberocash', 'order']);
const WEB_IMG = /\.(jpe?g|png|webp|gif)$/i;
const text = (html) => String(html || '').replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
    .replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/‑/g, '-').replace(/\s+/g, ' ').trim();

// exact-case existence (macOS forgives a wrong case; GitHub Pages does not)
function fileState(p) {
    if (typeof p !== 'string' || !p) return 'empty path';
    if (/^\/|^https?:/i.test(p)) return 'must be a relative path like assets/...';
    let dir = ROOT;
    for (const part of p.split('/')) {
        let names;
        try { names = fs.readdirSync(dir); } catch (e) { return 'MISSING'; }
        if (!names.includes(part)) return names.some((n) => n.toLowerCase() === part.toLowerCase()) ? 'WRONG CASE' : 'MISSING';
        dir = path.join(dir, part);
    }
    return 'ok';
}

function inspect(key) {
    const it = data[key], F = L.facet(key), warn = [], info = [];
    if (!/^[A-Za-z0-9_-]+$/.test(key)) warn.push(`key "${key}" must match ^[A-Za-z0-9_-]+$ (it is the URL #/item/${key})`);
    for (const f of Object.keys(it)) if (!KNOWN.has(f)) warn.push(`unknown field "${f}" (typo?) — the app ignores it`);
    const want = SECTION_FOR[it.type];
    if (!want) warn.push(`type "${it.type}" is not one of club|food|fun|spa|golf|store — the app drops this item`);
    else if (sectionOf[key] !== want) warn.push(`sits under // ${sectionOf[key] || '(no section)'} but type "${it.type}" belongs under // ${want}`);
    ['title', 'sub', 'desc'].forEach((f) => { if (typeof it[f] !== 'string' || !it[f].trim()) warn.push(`"${f}" is empty`); });
    if (!F) return { it, F, warn, info };

    // photos
    const gal = Array.isArray(it.gallery) ? it.gallery : [];
    if (!Array.isArray(it.gallery)) warn.push('"gallery" must be an array (use [] when there are no photos yet)');
    if (!gal.length && F.status !== 'coming-soon') info.push('no photos: the card shows the branded placeholder' + (it.logo ? ' with the logo' : ''));
    const seen = new Set();
    gal.forEach((p, i) => {
        const st = fileState(p);
        if (st !== 'ok') warn.push(`gallery[${i}] ${p}: ${st}`);
        if (seen.has(p)) warn.push(`gallery[${i}] ${p} is listed twice`);
        seen.add(p);
        if (!WEB_IMG.test(p)) warn.push(`gallery[${i}] ${p}: not a web image (HEIC?) — convert to .jpg (to_jpg.py)`);
        if (/logo|wordmark/i.test(path.basename(p)) || p === it.logo) warn.push(`gallery[${i}] ${p} looks like a logo — logos go in "logo", never in gallery`);
    });
    ['logo', 'partnerLogo', 'pdf', 'video'].forEach((f) => {
        if (it[f]) { const st = fileState(it[f]); if (st !== 'ok') warn.push(`${f} ${it[f]}: ${st}`); }
    });
    (Array.isArray(it.pdfs) ? it.pdfs : []).forEach((m, i) => {
        if (!m || !m.url) warn.push(`pdfs[${i}] has no "url"`);
        else { const st = fileState(m.url); if (st !== 'ok') warn.push(`pdfs[${i}] ${m.url}: ${st}`); }
        if (m && !m.label) info.push(`pdfs[${i}] has no "label" (shown as "${it.type === 'food' ? 'Menu' : 'Brochure'}")`);
    });
    let hero = '';
    if (gal[0]) {
        const m = MEDIA && MEDIA.img && MEDIA.img[gal[0]];
        if (!m) hero = 'not in js/media.js yet — run python3 scripts/build-images.py';
        else {
            hero = `${m.w}px wide`;
            if (m.w < 800) info.push(`hero photo gallery[0] is only ${m.w}px wide — looks soft full-width; ask staff for a larger original or put a bigger photo first`);
        }
        const missing = gal.filter((p) => !(MEDIA && MEDIA.img && MEDIA.img[p]));
        if (missing.length && m) info.push(`${missing.length} photo(s) not in js/media.js yet — run python3 scripts/build-images.py`);
    }

    // prices
    const rowsInDesc = (String(it.desc || '').match(/class="price-row"/g) || []).length;
    if (rowsInDesc !== F.rows.length) warn.push(`desc has ${rowsInDesc} price-row div(s) but only ${F.rows.length} parse — use exactly <div class="price-row"><span>Label</span><strong>$00.00</strong></div>`);
    if (/price-row/.test(it.desc || '') && !/class="price-box"/.test(it.desc || '')) warn.push('price rows must sit inside <div class="price-box">…</div>');
    F.rows.forEach((r) => {
        if (r.value == null) warn.push(`price "${r.label}" = "${r.text}" has no number — it never counts toward "From"`);
        else if ((r.text.match(/\d+(?:[.,]\d+)*/g) || []).length > 1) warn.push(`price "${r.label}" = "${r.text}" holds two numbers (parsed as ${r.value}) — one price per row`);
    });
    if (/\$\s?\d/.test(F.descText)) info.push('a "$" amount sits in the prose: it is shown but not parsed — put prices in price-box rows');

    // duration / time / hours
    if (it.duration && F.dur.maxHours == null) warn.push(`duration "${it.duration}" is not understood (use "4 Hours", "5-7 Hours", "4 or 8 Hours", "50 Minutes") — shown as typed, no half/full-day tag`);
    F.slots.forEach((s) => { if (!s.range) info.push(`time slot "${s.value}" has no clock time the app can read — shown as typed`); });
    F.hours.forEach((h) => { if (!h.ok) warn.push(`hours "${h.raw}" does not match the grammar ("Dinner 17:00-23:00", "Lunch 11:00-17:00 Mon-Sat", "Dinner from 18:00") — no open/closed status`); });
    ['itinerary', 'essentials'].forEach((f) => { if (it[f] !== undefined && !Array.isArray(it[f])) warn.push(`"${f}" must be an array, one entry per line`); });

    // claims the guest will read
    if (F.iberocash && typeof it.iberocash !== 'boolean') info.push('shows "IberoCash accepted" by default — confirm with staff, or set "iberocash": false');
    if (it.type === 'fun' && F.channel === 'both' && !it.channel) info.push('channel "both": shown in lobby (in-house) AND off-site mode — set "channel" if it is Red Sail-only or Rocka-only');
    return { it, F, warn, info, hero };
}

// Where the parsed "From" price appears (js/lib.js cardMeta/factsOf, js/app.js search rows and tickets).
const FROM_WHERE = {
    fun: 'shown as "From" on the card, in the facts strip and in search results',
    spa: 'shown as "Price: From …" in the facts strip; the card shows no price',
    other: 'not on the card or the sheet\'s facts (the sheet lists every row); only in the concierge request and saved-list tickets'
};
const fmtFacts = (F) => L.factsOf(F).map((x) => `${x.dt}: ${text(x.dd)}`).join(' · ') || '—';
function full(key) {
    const r = inspect(key), { it, F } = r;
    console.log(`\n${key}  (${it.type}, under // ${sectionOf[key] || '?'})  "${it.title}" — ${it.sub || ''}`);
    if (F) {
        const cm = L.cardMeta(F);
        console.log(`  card      ${text(cm.eyebrow) || '—'}  |  ${text(cm.meta) || '—'}${cm.price ? '  |  ' + text(cm.price) : ''}`);
        console.log(`  facts     ${fmtFacts(F)}`);
        console.log(`  area      ${F.area || '—'}${F.cuisine ? '   cuisine ' + F.cuisine : ''}${F.meals.length ? '   meals ' + F.meals.join(', ') + (F.mealsDerived ? ' (derived)' : '') : ''}`);
        console.log(`  prices    ${F.rows.length ? F.rows.map((x) => `${x.label} ${x.text}`).join(' · ') + '   (all listed under "Prices" in the sheet)' : '—'}`);
        if (F.from) console.log(`  from      "${L.fromText(F.from)}" — ${FROM_WHERE[it.type] || FROM_WHERE.other}`);
        console.log(`  duration  ${it.duration ? `"${it.duration}" → ${F.dur.text}` : '—'}`);
        console.log(`  time      ${F.slots.length ? F.slots.map((s) => `${s.label ? s.label + ': ' : ''}${s.short || '"' + s.value + '" (as typed)'}`).join(' | ') : '—'}`);
        console.log(`  hours     ${F.hours.length ? F.hours.map((h) => h.ok ? h.raw : `"${h.raw}" (NOT parsed)`).join(' | ') : '— (no open/closed status)'}`
            + (cm.status && cm.status.text ? `   → card line "${text(cm.status.text)}" (Aruba time now)` : ''));
        if (Array.isArray(it.itinerary)) console.log(`  itinerary ${it.itinerary.length} stop(s)`);
        if (Array.isArray(it.essentials)) it.essentials.forEach((e) => console.log(`  essential [${L.essentialGroupTitle(L.classifyEssential(e), it)}] ${e}`));
        const explore = ['fun', 'golf', 'store'].includes(it.type);
        console.log(`  tags      ${F.tags.join(', ') || '—'}${F.tags.length && !explore ? '   (filter chips exist on Explore only; for this type tags feed search and Today picks)' : ''}`);
        console.log(`  status    ${F.status || 'live'}   channel ${F.channel}   IberoCash line ${F.iberocash ? 'shown' : 'hidden'}   menus ${F.menus.map((m) => m.label).join(', ') || '—'}`);
        const contact = ['bookUrl', 'phone', 'whatsapp', 'address'].filter((f) => it[f]);
        console.log(`  contact   ${contact.length ? contact.join(', ') : '— (no booking/contact buttons)'}`);
        console.log(`  photos    ${(it.gallery || []).length}${it.gallery && it.gallery[0] ? `; hero ${it.gallery[0]} (${r.hero})` : ''}${it.logo ? `; logo ${it.logo}` : ''}`);
    }
    r.info.forEach((m) => console.log(`  note      ${m}`));
    r.warn.forEach((m) => console.log(`  ⚠ WARN    ${m}`));
    if (!r.warn.length) console.log('  ✓ no warnings');
    return r.warn.length;
}

// ---------------------------------------------------------------- --files (before removing an item)
const CODE_FILES = ['index.html', 'admin.html', 'qr.html', 'manifest.webmanifest', 'sw.js', 'js/app.js', 'js/lib.js',
    'js/admin.js', 'js/image-utils.js', 'css/styles.css', 'css/admin.css', 'scripts/build-images.py'];
function refsOf(it) {
    const out = [];
    if (Array.isArray(it.gallery)) out.push(...it.gallery);
    ['logo', 'partnerLogo', 'pdf', 'video'].forEach((f) => out.push(it[f]));
    if (Array.isArray(it.pdfs)) it.pdfs.forEach((m) => out.push(m && m.url));
    return [...new Set(out.filter((p) => typeof p === 'string' && p))];
}
function filesReport(key) {
    const it = data[key], mine = refsOf(it);
    const usedBy = {};
    for (const [k, o] of Object.entries(data)) if (k !== key) refsOf(o).forEach((p) => { (usedBy[p] = usedBy[p] || []).push(k); });
    const code = CODE_FILES.filter((rel) => fs.existsSync(path.join(ROOT, rel))).map((rel) => ({ rel, src: fs.readFileSync(path.join(ROOT, rel), 'utf8') }));
    const inCode = (p) => code.filter((c) => c.src.includes(p)).map((c) => c.rel);
    const usedElsewhere = (p) => [...(usedBy[p] || []), ...inCode(p)];
    console.log(`\n${key}  "${it.title}" — its files (run this BEFORE deleting the entry):`);
    if (!mine.length) console.log('  (no files)');
    for (const p of mine) {
        const other = usedElsewhere(p), st = fileState(p);
        console.log(other.length ? `  keep     ${p}   (also used by ${other.join(', ')})` : `  delete   ${p}${st !== 'ok' ? `   (${st})` : ''}`);
    }
    for (const d of [...new Set(mine.map((p) => path.posix.dirname(p)))]) {
        const abs = path.join(ROOT, d);
        if (!fs.existsSync(abs)) continue;
        const rels = fs.readdirSync(abs).filter((n) => fs.statSync(path.join(abs, n)).isFile()).map((n) => `${d}/${n}`);
        const shared = rels.filter((r) => usedElsewhere(r).length);
        const unlisted = rels.filter((r) => !mine.includes(r) && !shared.includes(r));
        const prefixes = [...new Set(mine.filter((p) => path.posix.dirname(p) === d).map((p) => path.posix.basename(p).replace(/_?\d*\.[^.]+$/, '')).filter(Boolean))];
        const alike = unlisted.filter((r) => prefixes.some((px) => path.posix.basename(r).startsWith(px + '_') || path.posix.basename(r).startsWith(px + '.')));
        if (shared.length && !alike.length && !mine.some((p) => path.posix.dirname(p) === d && !usedElsewhere(p).length)) continue; // nothing of ours to delete here
        if (!shared.length) {
            console.log(`  folder   ${d}/ — nothing else uses it: delete the whole folder (${rels.length} file(s)${unlisted.length ? `, ${unlisted.length} of them not listed in data.js` : ''})`);
            continue;
        }
        console.log(`  folder   ${d}/ — shared (${shared.length} file(s) used elsewhere): keep the folder; delete only the files marked delete`);
        alike.forEach((r) => console.log(`  delete?  ${r}   (nothing uses it and it is named like this item's files: probably an old photo of it)`));
    }
    const keyRe = new RegExp(`['"\`]${key.replace(/[-]/g, '\\-')}['"\`]`);
    for (const c of code) {
        c.src.split('\n').forEach((line, i) => {
            if (keyRe.test(line)) console.log(`  code     ${c.rel}:${i + 1} names "${key}" — the app treats it specially; removing it is a code change, ask first`);
        });
    }
    console.log('  next     delete the entry and any files marked delete, then python3 scripts/build-images.py (prunes their WebP copies), bump, verify');
}

let warnings = 0;
if (args.includes('--files') && !keysWanted.length) { console.error('✗ --files needs the key of the item, e.g. --files UTV'); process.exit(2); }
if (keysWanted.length) {
    for (const k of keysWanted) {
        if (!Object.prototype.hasOwnProperty.call(data, k)) {
            const near = Object.keys(data).filter((x) => x.toLowerCase().includes(k.toLowerCase()));
            console.error(`✗ no item "${k}" in js/data.js${near.length ? ` (did you mean ${near.join(', ')}?)` : ''}`);
            process.exit(2);
        }
        if (args.includes('--files')) filesReport(k); else warnings += full(k);
    }
} else {
    for (const k of Object.keys(data)) {
        const r = inspect(k);
        const cm = r.F ? L.cardMeta(r.F) : null;
        console.log(`${r.warn.length ? '⚠' : '✓'} ${k.padEnd(20)} ${String(r.it.type).padEnd(5)} ${(r.it.title || '').slice(0, 34).padEnd(34)} ${cm ? text(cm.eyebrow).slice(0, 40) : ''}${cm && cm.price ? ' · ' + text(cm.price) : ''}`);
        r.warn.forEach((m) => console.log(`    ⚠ ${m}`));
        warnings += r.warn.length;
    }
    console.log(`\n${Object.keys(data).length} items, ${warnings} warning(s). Full read-out: node .claude/skills/add-content/check-item.js <key>`);
}
process.exit(warnings ? 1 : 0);
