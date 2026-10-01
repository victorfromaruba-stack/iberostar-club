#!/usr/bin/env node
/*
 * Screenshot set for reviewing UI changes in the guest app (and admin), with console errors,
 * failed requests, broken images, sideways scrolling and missing cards collected per shot.
 * Run it from the repo root:
 *
 *   NODE_PATH=<dir>/node_modules node .claude/skills/preview/preview.js [options]
 *
 *   --check          only check the setup (Playwright found, Chromium starts) and exit
 *   --out DIR        where PNGs, report.json and index.html go (default: <tmp>/ib-preview)
 *   --url URL        use a server that is already running; it must serve THIS folder (the script
 *                    compares a few files and stops if not). Default: start python3 -m http.server
 *                    on a free port for this repo and stop it at the end.
 *   --any-server     with --url: skip that comparison (e.g. to shoot the live site); item keys are
 *                    then read from the served js/data.js
 *   --item KEY       card, detail sheet, lightbox and search for this item; repeatable or
 *                    comma-separated (default: Marea,UTV, without the card/search checks)
 *   --only LIST      shots to take: today,dine,explore,spa,saved,search,card,detail,lightbox,inhouse,admin
 *   --devices LIST   phone,desktop (default both): iPhone 13 and 1440x900
 *   --times LIST     day,night (default); morning and sunset work too
 *   --query TEXT     search shot query (default: each --item's title, else "sunset")
 *   --full           whole-page screenshots of the tab, saved and lobby views (scrolled through
 *                    first so lazy photos load); other shots are always one screen
 *   --css-pixels     1x pixels on the phone (smaller files) instead of the iPhone's 3x
 *   --root DIR       repo to serve (default: the repo containing this script)
 *
 * Browser: $CHROMIUM_PATH if set, else /opt/pw-browsers/chromium if it exists, else Playwright's own.
 * Every guest URL carries ?nosw=1 and service workers are blocked, so a stale cached release can
 * never be what you are looking at. Exit 0 = no problems; 1 = something to look at (see the summary
 * / report.json); 2 = setup problem (bad option, no Playwright/Chromium, wrong or dead --url).
 */
'use strict';
const fs = require('fs');
const os = require('os');
const net = require('net');
const vm = require('vm');
const path = require('path');
const http = require('http');
const https = require('https');
const { spawn } = require('child_process');

const die = (msg) => { console.error(msg); process.exit(2); };

let pw;
try { pw = require('playwright'); } catch (e) {
    die('✗ playwright not found. Install it once in a scratch folder, then point NODE_PATH at it (same command line):\n'
        + '    npm i --prefix /tmp/ib-pw playwright\n'
        + '    NODE_PATH=/tmp/ib-pw/node_modules node .claude/skills/preview/preview.js');
}

// ---------------------------------------------------------------- options
const argv = process.argv.slice(2);
const opt = (name, def) => { const i = argv.indexOf(name); return i >= 0 && argv[i + 1] != null ? argv[i + 1] : def; };
const optAll = (name) => argv.flatMap((a, i) => (a === name && argv[i + 1] != null ? argv[i + 1].split(',') : [])).map((s) => s.trim()).filter(Boolean);
const list = (name, def) => (opt(name) ? opt(name).split(',').map((s) => s.trim()).filter(Boolean) : def);
const ROOT = path.resolve(opt('--root', path.join(__dirname, '..', '..', '..')));
const OUT = path.resolve(opt('--out', path.join(os.tmpdir(), 'ib-preview')));
const ALL_SHOTS = ['today', 'dine', 'explore', 'spa', 'saved', 'search', 'card', 'detail', 'lightbox', 'inhouse', 'admin'];
const ALL_DEVICES = ['phone', 'desktop'];
const ALL_TIMES = ['morning', 'day', 'sunset', 'night'];
const ONLY = new Set(list('--only', ALL_SHOTS));
const DEVICES = list('--devices', ALL_DEVICES);
const TIMES = list('--times', ['day', 'night']);
const FULL = argv.includes('--full');
const CSS_PIXELS = argv.includes('--css-pixels');
const ANY_SERVER = argv.includes('--any-server');
for (const [what, got, ok] of [['shot', [...ONLY], ALL_SHOTS], ['device', DEVICES, ALL_DEVICES], ['time', TIMES, ALL_TIMES]]) {
    const bad = got.filter((s) => !ok.includes(s));
    if (bad.length) die(`✗ unknown ${what}(s): ${bad.join(', ')} (choose from ${ok.join(', ')})`);
}
if (ANY_SERVER && !opt('--url')) die('✗ --any-server only makes sense with --url');

const browserPath = () => [process.env.CHROMIUM_PATH, '/opt/pw-browsers/chromium'].find((p) => p && fs.existsSync(p));
async function launch() {
    const exe = browserPath();
    if (process.env.CHROMIUM_PATH && exe !== process.env.CHROMIUM_PATH) console.error(`⚠ $CHROMIUM_PATH ${process.env.CHROMIUM_PATH} does not exist; ignoring it`);
    try { return await pw.chromium.launch(exe ? { executablePath: exe } : {}); } catch (e) {
        die(`✗ Chromium did not start (${e.message.split('\n')[0]}).\n  Install a browser once: node <dir>/node_modules/playwright/cli.js install chromium`
            + '\n  or set CHROMIUM_PATH to a Chromium/Chrome binary.');
    }
}

// ---------------------------------------------------------------- http helpers
const fetchText = (url) => new Promise((res) => {
    const mod = url.startsWith('https:') ? https : http;
    const req = mod.get(url, (r) => {
        const chunks = [];
        r.on('data', (c) => chunks.push(c));
        r.on('end', () => res({ status: r.statusCode, body: Buffer.concat(chunks) }));
    });
    req.on('error', () => res({ status: 0, body: null }));
    req.setTimeout(5000, () => req.destroy());
});
const freePort = () => new Promise((res, rej) => {
    const s = net.createServer().once('error', rej).listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); });
});
async function startServer() {
    const port = await freePort();
    const child = spawn('python3', ['-m', 'http.server', String(port), '--bind', '127.0.0.1', '--directory', ROOT], { stdio: 'ignore' });
    child.on('error', (e) => die(`✗ could not start python3 -m http.server: ${e.message}`));
    const base = `http://127.0.0.1:${port}/`;
    for (let i = 0; i < 50; i++) {
        if ((await fetchText(base)).status === 200) return { base, child };
        await new Promise((r) => setTimeout(r, 200));
    }
    child.kill();
    die(`✗ the server on ${base} did not answer`);
}
// A server started elsewhere may serve another copy of the repo: the screenshots would then show
// that copy while item keys are checked against this one. Compare what it serves with these files.
const COMPARE = ['js/data.js', 'js/app.js', 'js/lib.js', 'css/styles.css', 'index.html'];
async function sameFolder(base) {
    const differ = [];
    for (const rel of COMPARE) {
        const local = path.join(ROOT, rel);
        const r = await fetchText(base + rel);
        if (r.status !== 200 || !fs.existsSync(local) || !r.body.equals(fs.readFileSync(local))) differ.push(`${rel}${r.status !== 200 ? ` (HTTP ${r.status || 'error'})` : ''}`);
    }
    return differ;
}

// ---------------------------------------------------------------- catalog
const loadData = (src) => { const g = {}; new Function('g', src.replace('const defaultData', 'g.defaultData'))(g); return g.defaultData; };
// The app's own facet parser (js/lib.js, a classic script) for each item's channel.
function channelsOf(data, libSrc) {
    try {
        const L = vm.runInNewContext(libSrc + '\n;({ buildFacets, facet })', { console });
        L.buildFacets(data);
        return (k) => (L.facet(k) || {}).channel || 'both';
    } catch (e) { return () => 'both'; }
}
const TAB_OF = { food: 'dine', fun: 'explore', golf: 'explore', store: 'explore', spa: 'spa', club: 'resorts' };

// ---------------------------------------------------------------- shots
const DEVICE = {
    phone: { ...pw.devices['iPhone 13'], ...(CSS_PIXELS ? { deviceScaleFactor: 1 } : {}) },
    desktop: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 }
};

async function settle(page, shot) {
    await page.waitForSelector(shot.wait || 'main .view:not([hidden])', { state: 'attached', timeout: 10000 });
    await page.evaluate(() => document.fonts && document.fonts.ready);
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
    if (shot.full) {
        // Photos below the first screen load only when scrolled near (observeLazy): scroll through once.
        await page.evaluate(async () => {
            const step = Math.max(200, Math.round(innerHeight * 0.8));
            for (let y = 0; y < document.documentElement.scrollHeight; y += step) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 150)); }
            scrollTo(0, 0);
        });
        await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
    }
    await page.waitForTimeout(500); // sheet/overlay transitions (reduced motion keeps these short)
}

async function inspectPage(page) {
    return page.evaluate(() => {
        const vis = (el) => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
        const imgs = [...document.querySelectorAll('img[data-orig]')];
        return {
            overflowX: Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
            brokenImages: [...document.querySelectorAll('img[data-failed="true"]')].map((i) => i.dataset.orig || i.dataset.retryBase || i.getAttribute('src')),
            // no WebP derivative in js/media.js (rendered without srcset), or the derivative failed to load
            originalFallbacks: [...new Set(imgs.filter((i) => i.dataset.stage === 'orig' || !(i.hasAttribute('srcset') || i.hasAttribute('data-srcset')))
                .map((i) => i.dataset.orig))],
            placeholders: [...document.querySelectorAll('.ph')].filter(vis).length,
            theme: document.documentElement.dataset.theme,
            phase: document.documentElement.dataset.phase
        };
    });
}

async function run() {
    const server = opt('--url') ? { base: opt('--url').replace(/\/?$/, '/'), child: null } : null;
    if (server && (await fetchText(server.base)).status !== 200) die(`✗ nothing answers at ${server.base}`);
    if (server && !ANY_SERVER) {
        const differ = await sameFolder(server.base);
        if (differ.length) {
            die(`✗ ${server.base} does not serve ${ROOT}: ${differ.join(', ')} differ.\n`
                + '  Drop --url (the script starts its own server for this folder), start a server from this folder,\n'
                + '  or add --any-server if you really mean to shoot that site.');
        }
    }
    // Catalog: this folder's js/data.js (or, with --any-server, the served one).
    let data, libSrc;
    try {
        if (server && ANY_SERVER) {
            data = loadData((await fetchText(server.base + 'js/data.js')).body.toString('utf8'));
            libSrc = (await fetchText(server.base + 'js/lib.js')).body.toString('utf8');
        } else {
            data = loadData(fs.readFileSync(path.join(ROOT, 'js', 'data.js'), 'utf8'));
            libSrc = fs.readFileSync(path.join(ROOT, 'js', 'lib.js'), 'utf8');
        }
    } catch (e) { die(`✗ could not load the catalog (js/data.js): ${e.message}`); }
    const explicitItems = optAll('--item');
    const ITEMS = explicitItems.length ? explicitItems : ['Marea', 'UTV'].filter((k) => data[k]);
    const unknown = ITEMS.filter((k) => !Object.prototype.hasOwnProperty.call(data, k));
    if (unknown.length) {
        const near = Object.keys(data).filter((x) => unknown.some((u) => x.toLowerCase().includes(u.toLowerCase().slice(0, 4))));
        die(`✗ no item ${unknown.join(', ')} in js/data.js${near.length ? ` (similar keys: ${near.slice(0, 8).join(', ')})` : ''}`);
    }
    const SAVED = ['Marea', 'UTV', 'SpaMain'].filter((k) => data[k]);
    const channel = channelsOf(data, libSrc);
    // In-house-only tours (Red Sail) are hidden from tabs and search unless the device is in lobby mode.
    const lobbyOnly = (k) => (channel(k) === 'in-house' ? 'inhouse' : '');
    // Search: one shot per explicit item, searching its title (and checking it is listed), unless --query.
    const QUERY = opt('--query');
    const searches = QUERY || !explicitItems.length ? [{ name: 'search', q: QUERY || 'sunset' }]
        : ITEMS.map((k) => ({ name: `search-${k}`, q: String(data[k].title || k).replace(/<[^>]*>/g, ''), expect: k, mode: lobbyOnly(k) }));

    const browser = await launch();
    if (argv.includes('--check')) {
        let where = '?';
        try { where = path.dirname(require.resolve('playwright/package.json')) + ' ' + require('playwright/package.json').version; } catch (e) { /* ignore */ }
        console.log(`playwright  ${where}\nchromium    ${browserPath() || "Playwright's own"} (${browser.version()})\nready`);
        await browser.close();
        process.exit(0);
    }
    const srv = server || await startServer();
    fs.mkdirSync(OUT, { recursive: true });
    console.log(`${srv.child ? 'Serving ' + ROOT + ' at' : 'Using'} ${srv.base}\nWriting to ${OUT}\n`);
    const results = [];

    function guestShots(time) {
        const s = [];
        const add = (name, hash, o = {}) => s.push({ name, hash, time, ...o });
        if (ONLY.has('today')) add('today', '#/today', { full: FULL });
        if (ONLY.has('dine')) add('dine', '#/dine', { full: FULL });
        if (ONLY.has('explore')) add('explore', '#/explore', { full: FULL });
        if (ONLY.has('spa')) add('spa', '#/spa', { full: FULL });
        if (ONLY.has('saved')) add('saved', '#/saved', { full: FULL });
        if (ONLY.has('search')) searches.forEach((q) => add(q.name, '#/search?q=' + encodeURIComponent(q.q), { wait: '#ovSearch:not([hidden])', expect: q.expect, mode: q.mode || '' }));
        for (const k of ITEMS) {
            const it = data[k], gal = Array.isArray(it.gallery) ? it.gallery : [];
            // The card in its tab (explicit items only): lobby mode for in-house-only tours.
            if (ONLY.has('card') && explicitItems.length) {
                add(`card-${k}`, `#/${TAB_OF[it.type] || 'today'}`, { cardKey: k, mode: lobbyOnly(k) });
            }
            if (ONLY.has('detail')) add(`detail-${k}`, `#/item/${encodeURIComponent(k)}`, { wait: '#ovDetail:not([hidden])' });
            if (ONLY.has('lightbox')) {
                if (gal.length) add(`lightbox-${k}`, `#/item/${encodeURIComponent(k)}/photos/1`, { wait: '#ovLightbox:not([hidden])' });
                else if (time === TIMES[0]) console.log(`  (no lightbox shot for ${k}: it has no photos)`);
            }
        }
        return s;
    }

    async function shoot(device, shot, init) {
        const ctx = await browser.newContext({ ...DEVICE[device], serviceWorkers: 'block', reducedMotion: 'reduce' });
        if (init) await ctx.addInitScript(init.fn, init.arg);
        const page = await ctx.newPage();
        const errors = [], failed = [], notes = [];
        page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
        page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
        // ERR_ABORTED is not a guest-visible failure: cancelled lazy images, and Chromium reports every
        // HEAD request (admin's missing-file probes) as aborted even when it returned 200.
        page.on('requestfailed', (r) => {
            const why = r.failure() ? r.failure().errorText : 'failed';
            if (!/ERR_ABORTED/.test(why)) failed.push(`${why} ${r.url()}`);
        });
        page.on('response', (r) => { if (r.status() >= 400) failed.push(`${r.status()} ${r.url()}`); });
        const url = srv.base + shot.path;
        const file = `${device}-${shot.label}.png`;
        let checks = {};
        try {
            await page.goto(url, { waitUntil: 'load', timeout: 20000 });
            await settle(page, shot);
            checks = await inspectPage(page);
            if (shot.time && checks.phase && checks.phase !== shot.time) notes.push(`asked for ${shot.time}, page shows ${checks.phase}`);
            if (shot.expect && !(await page.locator(`#ovSearch .srow[data-key="${shot.expect}"]`).count())) notes.push(`search did not list ${shot.expect}`);
            if (shot.cardKey) {
                const card = page.locator(`main .view:not([hidden]) :is(article, .cs-wrap, .cs-row)[data-key="${shot.cardKey}"]`).first();
                if (!(await card.count())) {
                    notes.push(`no card for ${shot.cardKey} in ${shot.hash}${shot.mode ? ' (lobby mode)' : ''}`);
                    await page.screenshot({ path: path.join(OUT, file) });
                } else {
                    await card.scrollIntoViewIfNeeded();
                    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
                    await page.waitForTimeout(400);
                    checks = { ...checks, ...(await inspectPage(page)) };
                    await card.screenshot({ path: path.join(OUT, file) });
                }
            } else {
                await page.screenshot({ path: path.join(OUT, file), fullPage: !!shot.full });
            }
        } catch (e) { errors.push('preview: ' + e.message.split('\n')[0]); }
        await ctx.close();
        const r = { file, url, device, ...checks, errors, failed: [...new Set(failed)], notes };
        const problems = r.errors.length + r.failed.length + (r.brokenImages || []).length + (r.overflowX > 1 ? 1 : 0) + notes.length;
        r.ok = problems === 0;
        results.push(r);
        const orig = r.originalFallbacks || [];
        console.log(`${r.ok ? '✓' : '✗'} ${file.padEnd(40)} ${checks.phase ? `${checks.phase}/${checks.theme}` : ''}`
            + (r.errors.length ? `  ${r.errors.length} console error(s)` : '') + (r.failed.length ? `  ${r.failed.length} failed request(s)` : '')
            + ((r.brokenImages || []).length ? `  ${r.brokenImages.length} broken image(s)` : '') + (r.overflowX > 1 ? `  scrolls sideways by ${r.overflowX}px` : '')
            + (notes.length ? `  ${notes.join('; ')}` : '')
            + (orig.length ? `  (note: ${orig.length} image(s) load the original, no WebP yet: run python3 scripts/build-images.py — ${orig.slice(0, 2).join(', ')}${orig.length > 2 ? ', …' : ''})` : ''));
    }

    const seedSaved = { fn: (keys) => { try { if (!localStorage.getItem('ib_saved')) localStorage.setItem('ib_saved', JSON.stringify(keys)); } catch (e) { /* ignore */ } }, arg: SAVED };
    for (const device of DEVICES) {
        for (const time of TIMES) {
            for (const s of guestShots(time)) {
                const mode = s.mode ? `&mode=${s.mode}` : '';
                await shoot(device, { ...s, label: `${time}-${s.name}`, path: `?nosw=1${mode}&time=${time}${s.hash}` }, s.name === 'saved' ? seedSaved : null);
            }
            if (ONLY.has('inhouse')) {
                for (const v of ['today', 'explore']) {
                    await shoot(device, { label: `${time}-inhouse-${v}`, time, hash: `#/${v}`, path: `?nosw=1&mode=inhouse&time=${time}#/${v}`, full: FULL });
                }
            }
        }
        if (ONLY.has('admin')) {
            await shoot(device, { label: 'admin-gate', path: 'admin.html', wait: '#gateScreen' });
            const k = ITEMS[0] || Object.keys(data)[0];
            const unlock = { fn: () => { try { sessionStorage.setItem('ib_admin_unlocked', 'true'); } catch (e) { /* ignore */ } } };
            await shoot(device, { label: `admin-edit-${k}`, path: `admin.html#${encodeURIComponent(k)}`, wait: '#adminContent.active' }, unlock);
        }
    }
    await browser.close();
    if (srv.child) srv.child.kill();

    fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(results, null, 2));
    const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const why = (r) => [...r.errors, ...r.failed, ...(r.brokenImages || []).map((b) => 'broken ' + b), r.overflowX > 1 ? 'overflow ' + r.overflowX + 'px' : '', ...r.notes].filter(Boolean).join(' · ');
    fs.writeFileSync(path.join(OUT, 'index.html'), `<!doctype html><meta charset="utf-8"><title>Preview</title>
<style>body{font:14px system-ui;margin:16px;background:#f4f1ea}figure{display:inline-block;vertical-align:top;margin:0 12px 16px 0}
img{max-height:520px;max-width:560px;border:1px solid #ccc;background:#fff}figcaption{max-width:420px}.bad{color:#b00020}.note{color:#7a5a00}</style>
${results.map((r) => `<figure><a href="${esc(r.file)}"><img src="${esc(r.file)}" alt="${esc(r.file)}"></a><figcaption class="${r.ok ? '' : 'bad'}">${esc(r.file)}${r.ok ? '' : ' — ' + esc(why(r))}${(r.originalFallbacks || []).length ? `<br><span class="note">no WebP yet: ${esc(r.originalFallbacks.join(', '))}</span>` : ''}</figcaption></figure>`).join('\n')}`);
    const nBad = results.filter((r) => !r.ok).length;
    console.log(`\n${results.length} screenshot(s), ${nBad} with problems. Open ${path.join(OUT, 'index.html')} or read the PNGs; details in report.json.`);
    process.exit(nBad ? 1 : 0);
}
run().catch((e) => { console.error(e); process.exit(2); });
