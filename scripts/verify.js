#!/usr/bin/env node
// Zero-dependency sanity checks for this repo. Run with: node scripts/verify.js
// Catches the two classes of bug that have actually shipped here before:
//   1. A gallery/pdf/video/logo path in js/data.js that doesn't exist on disk.
//   2. A responsive CSS rule that resets a safe-area-aware padding/margin via a
//      shorthand without re-declaring the longhand, silently dropping notch clearance.
//   3. A background painted with a token that the night theme flips (--ocean-deep turns
//      white) under a hard-coded text colour, which is white on white after dark.

const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');

let errors = 0;
const fail = (msg) => { console.error('✗ ' + msg); errors++; };
const ok = (msg) => console.log('✓ ' + msg);

// ---------- 1. Asset integrity ----------
function loadData() {
    const src = fs.readFileSync(path.join(root, 'js/data.js'), 'utf8')
        .replace('const defaultData =', 'module.exports =');
    const tmp = path.join(root, 'scripts/.data_check_tmp.js');
    fs.writeFileSync(tmp, src);
    const data = require(tmp);
    fs.unlinkSync(tmp);
    return data;
}

const data = loadData();
let refCount = 0;
Object.entries(data).forEach(([key, item]) => {
    ['title', 'type', 'desc', 'sub'].forEach(field => {
        if (!item[field]) fail(`${key}: missing required field "${field}"`);
    });
    (item.gallery || []).forEach(p => {
        refCount++;
        if (!fs.existsSync(path.join(root, p))) fail(`${key}: gallery path does not exist on disk: ${p}`);
    });
    ['pdf', 'video', 'partnerLogo'].forEach(f => {
        if (item[f]) {
            refCount++;
            if (!fs.existsSync(path.join(root, item[f]))) fail(`${key}: ${f} does not exist on disk: ${item[f]}`);
        }
    });
    (item.pdfs || []).forEach(p => {
        refCount++;
        if (!p.label) fail(`${key}: a pdfs[] entry is missing a label`);
        if (!fs.existsSync(path.join(root, p.url))) fail(`${key}: pdfs[] path does not exist on disk: ${p.url}`);
    });
});
if (errors === 0) ok(`asset integrity — ${Object.keys(data).length} items, ${refCount} file references, all present`);

// ---------- 2. DATA_VERSION stays in sync across app.js / admin.js ----------
const appJs = fs.readFileSync(path.join(root, 'js/app.js'), 'utf8');
const adminJs = fs.readFileSync(path.join(root, 'js/admin.js'), 'utf8');
const appVer = /DATA_VERSION\s*=\s*(\d+)/.exec(appJs)?.[1];
const adminVer = /DATA_VERSION\s*=\s*(\d+)/.exec(adminJs)?.[1];
if (!appVer || !adminVer) {
    fail('could not find DATA_VERSION in js/app.js and/or js/admin.js');
} else if (appVer !== adminVer) {
    fail(`DATA_VERSION mismatch — js/app.js=${appVer}, js/admin.js=${adminVer} (they must match, or returning visitors keep stale cached data)`);
} else {
    ok(`DATA_VERSION in sync — ${appVer}`);
}

// ---------- 3. Safe-area padding/margin can't be silently dropped by a later shorthand ----------
// Any selector with a longhand like "padding-top: calc(... var(--safe-top) ...)" is opting
// into notch/Dynamic Island clearance. If ANY rule for that same selector text later in the
// file sets the shorthand ("padding: ...") without also re-declaring that longhand, the
// shorthand silently wins and the clearance is lost — this exact bug shipped once already.
const css = fs.readFileSync(path.join(root, 'css/styles.css'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, ''); // strip comments so they can't get glued onto selectors

// A real (brace-depth-aware) parser, not a flat regex — the previous version treated
// "@media (...) { main { padding: ... } }" as its own broken (selector, body) pair split on
// the first "{"/"}" it saw, so it never actually looked at rules nested inside a media query,
// which is exactly where the safe-area cascade bug this check exists for actually lives.
function parseRules(text) {
    const rules = [];
    let i = 0;
    function skipToBrace() {
        const start = i;
        while (i < text.length && text[i] !== '{' && text[i] !== '}') i++;
        return text.slice(start, i).trim();
    }
    function parseBlock() {
        while (i < text.length) {
            const header = skipToBrace();
            if (i >= text.length) break;
            if (text[i] === '}') { i++; return; } // end of an enclosing block
            i++; // consume '{'
            if (header.startsWith('@')) {
                parseBlock(); // recurse into @media/@supports/etc — its children are real rules
            } else if (header) {
                const bodyStart = i;
                let depth = 1;
                while (i < text.length && depth > 0) {
                    if (text[i] === '{') depth++;
                    else if (text[i] === '}') depth--;
                    i++;
                }
                const body = text.slice(bodyStart, i - 1);
                header.split(',').forEach(sel => rules.push({ selector: sel.trim(), body }));
            } else {
                i++; // stray brace, don't loop forever
            }
        }
    }
    parseBlock();
    return rules;
}

const rules = parseRules(css);

const safeAreaSelectors = new Set();
rules.forEach(r => {
    if (/(padding|margin)(-top)?\s*:\s*calc\([^)]*(--safe-top|safe-area-inset-top)[^)]*\)/.test(r.body)) {
        safeAreaSelectors.add(r.selector);
    }
});

safeAreaSelectors.forEach(sel => {
    rules.forEach(r => {
        if (r.selector !== sel) return;
        const hasShorthand = /\b(padding|margin)\s*:/.test(r.body);
        const hasLonghandTop = /(padding|margin)-top\s*:/.test(r.body);
        if (hasShorthand && !hasLonghandTop) {
            fail(`css/styles.css: "${sel}" sets a padding/margin shorthand without a padding-top/margin-top override, in a rule that elsewhere relies on safe-area clearance — this silently drops notch/Dynamic Island padding`);
        }
    });
});
if (![...safeAreaSelectors].some(sel => rules.some(r => r.selector === sel && /\b(padding|margin)\s*:/.test(r.body) && !/(padding|margin)-top\s*:/.test(r.body)))) {
    ok(`safe-area cascade — ${safeAreaSelectors.size} selector(s) using --safe-top, no shorthand silently overrides them`);
}

// ---------- 4. Night theme can't turn a token background into white-on-white ----------
// body.dark-theme is switched on by the visitor's clock (updateTimeVibe in js/app.js), so
// every guest who opens the app in the evening gets it. It flips several tokens: --ocean-deep
// goes from navy to #FFFFFF. A rule that paints its background with a flipped token but types
// its text colour as a literal ("color: white") keeps the text and loses the background:
// white on white at night. That shipped on .skip-link. .btn-primary has the same pattern and
// only survives because it has its own body.dark-theme override. So: a rule may use a flipped
// token as its background with a literal text colour only if body.dark-theme overrides it.
const norm = (s) => s.replace(/\s+/g, ' ').trim();
const flipped = new Set();
rules.filter(r => norm(r.selector) === 'body.dark-theme').forEach(r => {
    for (const m of r.body.matchAll(/(--[\w-]+)\s*:/g)) flipped.add(m[1]);
});
let flipChecked = 0;
const flipErrorsBefore = errors;
rules.forEach(r => {
    const sel = norm(r.selector);
    if (sel.includes('dark-theme')) return;
    const bg = /background(?:-color)?\s*:\s*var\((--[\w-]+)\)/.exec(r.body);
    if (!bg || !flipped.has(bg[1])) return;
    const fg = /(?:^|[;\s{])color\s*:\s*([^;]+)/.exec(r.body); // the [;\s{] guard skips background-color
    if (!fg || /var\(/.test(fg[1])) return; // text colour from a token flips along with it
    flipChecked++;
    const overridden = rules.some(d => norm(d.selector) === 'body.dark-theme ' + sel && /(background|color)\s*:/.test(d.body));
    if (!overridden) {
        fail(`css/styles.css: "${sel}" paints its background with ${bg[1]}, which body.dark-theme flips, but types its text colour as "${fg[1].trim()}" with no body.dark-theme override. At night that is unreadable. Use --ink for a surface that must stay dark, or add a body.dark-theme rule for it.`);
    }
});
if (flipped.size === 0) fail('css/styles.css: found no body.dark-theme token block. The night-theme check has nothing to compare against, so it would pass without checking anything.');
else if (errors === flipErrorsBefore) ok(`night-theme contrast — ${flipped.size} token(s) flipped at night, ${flipChecked} rule(s) with a literal text colour over one, all overridden`);

console.log('');
if (errors > 0) {
    console.error(`${errors} check(s) failed.`);
    process.exit(1);
} else {
    console.log('All checks passed.');
}
