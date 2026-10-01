#!/usr/bin/env node
/*
 * Zero-dependency release checks for this repo (spec v4 §D5 + §A.6). Run by hand:
 *
 *     node scripts/verify.js            # checks the repo this script lives in
 *     node scripts/verify.js <dir>      # checks another copy (fixtures, a worktree, a deploy dir)
 *     node scripts/verify.js --all      # print every problem (default: first 25 per check)
 *
 * ✓ = passed, ✗ = failure (exit code 1), ⚠ = warning (reported, never blocks).
 *
 * The bug classes these checks exist for have all shipped here before (or were found in the v4
 * audits): a data.js path that 404s on GitHub Pages, admin saves that silently drop fields or
 * comma-split lists, a version bump missed in one of the places the service worker relies on, a
 * responsive CSS shorthand that silently drops safe-area (notch / Dynamic Island) padding, focus
 * rings removed, zoom disabled, low-contrast tokens, and stale image derivatives.
 *
 *   1. Asset paths      gallery / logo / partnerLogo / pdf / pdfs[] / video (+ Today heroes) exist,
 *                       with exact filename case (macOS forgives a wrong case, GitHub Pages 404s).
 *   2. Optional fields  types, enums, hours grammar, tags, numbers, whatsapp digits (§B10).
 *   3. Item keys        ^[A-Za-z0-9_-]+$ (they are URL segments: #/item/<key>).
 *   4. Version sync     DATA_VERSION (app.js) == (admin.js) == VERSION (sw.js) == every ?v=.
 *   5. Media            js/media.js entries, hashes and derivatives; no _dirs; .nojekyll (§A.6).
 *   6. CSS lint         focus-visible, outline removal, .device- body selectors, infinite
 *                       animations, overshoot easing, safe-area shorthand cascade.
 *   7. HTML lint        zoom allowed, no inline on* handlers, every local reference exists.
 *   8. Token contrast   WCAG 2.x ratios for the light/dark token blocks (rgba composited).
 *   9. admin.js guards  saveItem spread-merges; itinerary/essentials never comma-split.
 *  10. CSS url()s       every @font-face (and other) url() in the stylesheets / qr.html exists.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const crypto = require('crypto');

// ---------------------------------------------------------------------------------------------
// CLI, output
// ---------------------------------------------------------------------------------------------
const argv = process.argv.slice(2);
if (argv.includes('-h') || argv.includes('--help')) {
    console.log('Usage: node scripts/verify.js [rootDir] [--all]\n  rootDir  repo copy to check (default: the repo containing this script)\n  --all    print every problem instead of the first 25 per check');
    process.exit(0);
}
const SHOW_ALL = argv.includes('--all');
const root = path.resolve(argv.find((a) => !a.startsWith('-')) || path.join(__dirname, '..'));
if (!fs.existsSync(root) || !fs.statSync(root).isDirectory()) {
    console.error(`✗ root directory not found: ${root}`);
    process.exit(2);
}

const COLOR = process.stdout.isTTY && !process.env.NO_COLOR;
const paint = (code) => (s) => (COLOR ? `\x1b[${code}m${s}\x1b[0m` : s);
const red = paint('31'), green = paint('32'), yellow = paint('33'), bold = paint('1'), dim = paint('2');

const MAX_LINES = 25;
let failures = 0, warnings = 0;
let cur = null;                     // current section
const failedSections = [];

function section(title) {
    cur = { title, fails: 0, warns: 0, printed: 0, suppressed: 0 };
    console.log('\n' + bold(title));
}
function emit(line) {
    if (SHOW_ALL || cur.printed < MAX_LINES) { console.log(line); cur.printed++; } else cur.suppressed++;
}
function fail(msg) { failures++; cur.fails++; emit('  ' + red('✗') + ' ' + msg); }
function warn(msg) { warnings++; cur.warns++; emit('  ' + yellow('⚠') + ' ' + msg); }
function ok(msg) { console.log('  ' + green('✓') + ' ' + msg); }
function note(msg) { console.log('  ' + dim('· ' + msg)); }
function endSection() {
    if (cur.suppressed) console.log(dim(`  … ${cur.suppressed} more line(s) not shown (run with --all)`));
    if (cur.fails) failedSections.push(cur.title);
}
function check(title, fn) {
    section(title);
    try { fn(); } catch (e) { fail(`check crashed: ${e && e.stack ? e.stack.split('\n').slice(0, 3).join(' | ') : e}`); }
    endSection();
}

// ---------------------------------------------------------------------------------------------
// File helpers (all paths repo-relative with forward slashes)
// ---------------------------------------------------------------------------------------------
const abs = (rel) => path.join(root, ...String(rel).split('/'));
function read(rel) {
    try { return fs.readFileSync(abs(rel), 'utf8'); } catch (e) { return null; }
}
function sizeOf(rel) { try { return fs.statSync(abs(rel)).size; } catch (e) { return 0; } }
const fmtKB = (b) => (b >= 1e6 ? `${(b / 1e6).toFixed(1)} MB` : `${Math.round(b / 1e3)} KB`);
const plural = (n, w, p) => `${n} ${n === 1 ? w : (p || w + 's')}`;

const dirCache = new Map();
function listDir(absDir) {
    if (!dirCache.has(absDir)) {
        let set = null;
        try { set = new Set(fs.readdirSync(absDir)); } catch (e) { /* not a dir */ }
        dirCache.set(absDir, set);
    }
    return dirCache.get(absDir);
}
// 'ok' | 'missing' | 'case' (exists only case-insensitively → 404 on GitHub Pages) | 'dir' | 'outside'
function fileStatus(rel) {
    const norm = path.posix.normalize(String(rel).replace(/^\.\//, ''));
    if (norm.startsWith('../') || norm === '..') return 'outside';
    const parts = norm.split('/').filter((p) => p && p !== '.');
    let p = root;
    for (const part of parts) {
        const set = listDir(p);
        if (!set || !set.has(part)) return fs.existsSync(path.join(p, part)) || fs.existsSync(abs(norm)) ? 'case' : 'missing';
        p = path.join(p, part);
    }
    try { return fs.statSync(p).isFile() ? 'ok' : 'dir'; } catch (e) { return 'missing'; }
}
const STATUS_TEXT = {
    missing: 'does not exist on disk',
    case: 'differs in upper/lower case from the file on disk (works on macOS/Windows, 404s on GitHub Pages)',
    dir: 'is a directory, not a file',
    outside: 'points outside the repo'
};

function lineIndex(text) {
    const starts = [0];
    for (let i = 0; i < text.length; i++) if (text[i] === '\n') starts.push(i + 1);
    return (offset) => {
        let lo = 0, hi = starts.length - 1;
        while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (starts[mid] <= offset) lo = mid; else hi = mid - 1; }
        return lo + 1;
    };
}
const blank = (s) => s.replace(/[^\n]/g, ' ');   // keep offsets + line numbers when masking text

// Evaluate a classic script that declares `const NAME = {...}` and return NAME as plain JSON.
function loadGlobal(rel, name) {
    const src = read(rel);
    if (src == null) return { missing: true };
    try {
        const json = vm.runInNewContext(`${src}\n;JSON.stringify(typeof ${name} === 'undefined' ? null : ${name})`,
            { console: { log() {}, warn() {}, error() {} } }, { filename: rel, timeout: 5000 });
        const value = json == null ? null : JSON.parse(json);
        return value == null ? { error: new Error(`${rel} does not define ${name}`) } : { value };
    } catch (e) { return { error: e }; }
}

// ---------------------------------------------------------------------------------------------
// Tiny CSS parser: flat rule list with @media/@supports context, declarations and offsets
// ---------------------------------------------------------------------------------------------
function skipQuoted(text, i) {
    const q = text[i];
    for (i++; i < text.length; i++) {
        if (text[i] === '\\') { i++; continue; }
        if (text[i] === q || text[i] === '\n' && q !== '`') return i + 1;
    }
    return text.length;
}
function splitTop(text, sep) {
    const out = []; let depth = 0, start = 0;
    for (let i = 0; i < text.length; i++) {
        const c = text[i];
        if (c === '"' || c === "'") { i = skipQuoted(text, i) - 1; continue; }
        if (c === '(' || c === '[') depth++;
        else if (c === ')' || c === ']') depth--;
        else if (c === sep && depth === 0) { out.push({ text: text.slice(start, i), start }); start = i + 1; }
    }
    out.push({ text: text.slice(start), start });
    return out;
}
function parseDecls(body, offset) {
    const decls = [];
    for (const part of splitTop(body, ';')) {
        const colon = part.text.indexOf(':');
        if (colon < 0) continue;
        const prop = part.text.slice(0, colon).trim().toLowerCase();
        if (!prop || /[{}\s]/.test(prop)) continue;
        let value = part.text.slice(colon + 1).trim();
        const important = /!\s*important\s*$/i.test(value);
        value = value.replace(/!\s*important\s*$/i, '').trim();
        decls.push({ prop, value, important, offset: offset + part.start + (part.text.length - part.text.trimStart().length) });
    }
    return decls;
}
function parseCss(raw) {
    const text = raw.replace(/\/\*[\s\S]*?\*\//g, blank);
    const rules = [], atRules = [];
    let i = 0;
    const n = text.length;
    function readUntilBrace() {
        const start = i; let depth = 0;
        while (i < n) {
            const c = text[i];
            if (c === '"' || c === "'") { i = skipQuoted(text, i); continue; }
            if (c === '(') depth++;
            else if (c === ')') depth--;
            else if (depth <= 0 && (c === '{' || c === '}' || c === ';')) break;
            i++;
        }
        return { text: text.slice(start, i), start };
    }
    function readBody() {
        const start = i; let depth = 1;
        while (i < n) {
            const c = text[i];
            if (c === '"' || c === "'") { i = skipQuoted(text, i); continue; }
            if (c === '{') depth++;
            else if (c === '}' && --depth === 0) break;
            i++;
        }
        const body = text.slice(start, i);
        i++;
        return { body, start };
    }
    function block(chain) {
        while (i < n) {
            const h = readUntilBrace();
            if (i >= n) break;
            const c = text[i];
            if (c === ';') { i++; continue; }          // @import/@charset or stray ;
            if (c === '}') { i++; return; }
            i++;                                     // '{'
            const header = h.text.trim();
            const start = h.start + (h.text.length - h.text.trimStart().length);
            if (header.startsWith('@')) {
                const name = (/^@([\w-]+)/.exec(header) || [, ''])[1].toLowerCase();
                if (/^(media|supports|layer|container|document|-moz-document|scope|starting-style)$/.test(name)) {
                    block(chain.concat(header));
                } else {
                    const b = readBody();
                    atRules.push({ name, header, body: b.body, start, chain, decls: parseDecls(b.body, b.start) });
                }
            } else if (header) {
                const b = readBody();
                const selectors = splitTop(header, ',').map((s) => s.text.trim().replace(/\s+/g, ' ')).filter(Boolean);
                rules.push({ selectorText: header.replace(/\s+/g, ' '), selectors, body: b.body, start, chain, decls: parseDecls(b.body, b.start), idx: rules.length });
            } else {
                readBody();                          // stray block, skip it
            }
        }
    }
    block([]);
    return { text, rules, atRules, line: lineIndex(text) };
}

// ---------------------------------------------------------------------------------------------
// Tiny HTML helpers: mask comments and <script>/<style> contents, then walk start tags
// ---------------------------------------------------------------------------------------------
function maskHtml(html, { keepScripts = false } = {}) {
    let out = html.replace(/<!--[\s\S]*?-->/g, blank);
    if (!keepScripts) {
        out = out.replace(/(<script\b[^>]*>)([\s\S]*?)(<\/script\s*>)/gi, (m, a, b, c) => a + blank(b) + c);
        out = out.replace(/(<style\b[^>]*>)([\s\S]*?)(<\/style\s*>)/gi, (m, a, b, c) => a + blank(b) + c);
    }
    return out;
}
function tagsOf(html) {
    const tags = [];
    const tagRe = /<([a-zA-Z][\w:-]*)((?:\s+[^\s"'>\/=]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'=<>`]+))?)*)\s*\/?>/g;
    let m;
    while ((m = tagRe.exec(html))) {
        const attrs = [];
        const attrRe = /([^\s"'>\/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
        let a;
        while ((a = attrRe.exec(m[2]))) {
            attrs.push({ name: a[1].toLowerCase(), value: a[2] ?? a[3] ?? a[4] ?? '', offset: m.index + 1 + m[1].length + a.index });
        }
        const get = (name) => { const x = attrs.find((t) => t.name === name); return x ? x.value : null; };
        tags.push({ name: m[1].toLowerCase(), attrs, get, offset: m.index });
    }
    return tags;
}
const EXTERNAL_URL = /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i;
function localUrlPath(url, baseDir) {
    // → repo-relative decoded path for a local URL, or null for anchors / external / data URLs
    const u = String(url).trim();
    if (!u || u.startsWith('#') || EXTERNAL_URL.test(u)) return null;
    let p = u.replace(/[?#].*$/, '');
    if (!p || p === '.' || p === './') return null;
    try { p = decodeURIComponent(p); } catch (e) { /* keep raw */ }
    if (p.startsWith('/')) return { abs: true, path: p };
    return { path: path.posix.normalize(path.posix.join(baseDir || '.', p)) };
}

// ---------------------------------------------------------------------------------------------
// Tiny JS helpers: brace matching that skips strings, templates, comments and regex literals
// ---------------------------------------------------------------------------------------------
const REGEX_PREFIX_WORDS = new Set(['return', 'typeof', 'case', 'in', 'of', 'yield', 'await', 'void', 'delete', 'new', 'instanceof', 'else', 'do']);
function regexAllowed(src, i, prevSig) {
    if (!prevSig) return true;
    if ('(,=:[!&|?{};+-*%<>~^'.includes(prevSig)) return true;
    if (/[\w$]/.test(prevSig)) {
        let j = i - 1;
        while (j >= 0 && /\s/.test(src[j])) j--;
        let k = j;
        while (k >= 0 && /[\w$]/.test(src[k])) k--;
        return REGEX_PREFIX_WORDS.has(src.slice(k + 1, j + 1));
    }
    return false;
}
function skipRegex(src, i) {
    let inClass = false;
    for (i++; i < src.length; i++) {
        const c = src[i];
        if (c === '\\') { i++; continue; }
        if (c === '\n') return i;
        if (inClass) { if (c === ']') inClass = false; continue; }
        if (c === '[') inClass = true;
        else if (c === '/') { i++; while (i < src.length && /[a-z]/i.test(src[i])) i++; return i; }
    }
    return i;
}
function skipTemplate(src, i) {
    for (i++; i < src.length; i++) {
        const c = src[i];
        if (c === '\\') { i++; continue; }
        if (c === '`') return i + 1;
        if (c === '$' && src[i + 1] === '{') { i = matchBrace(src, i + 1) - 1; }
    }
    return src.length;
}
// openIdx points at '{'; returns the index just past the matching '}'.
function matchBrace(src, openIdx) {
    let depth = 0, prevSig = '';
    for (let i = openIdx; i < src.length;) {
        const c = src[i], c2 = src[i + 1];
        if (c === '/' && c2 === '/') { const j = src.indexOf('\n', i); i = j < 0 ? src.length : j; continue; }
        if (c === '/' && c2 === '*') { const j = src.indexOf('*/', i + 2); i = j < 0 ? src.length : j + 2; continue; }
        if (c === '"' || c === "'") { i = skipQuoted(src, i); prevSig = 'a'; continue; }
        if (c === '`') { i = skipTemplate(src, i); prevSig = 'a'; continue; }
        if (c === '/' && regexAllowed(src, i, prevSig)) { i = skipRegex(src, i); prevSig = 'a'; continue; }
        if (c === '{') depth++;
        else if (c === '}' && --depth === 0) return i + 1;
        if (!/\s/.test(c)) prevSig = c;
        i++;
    }
    return src.length;
}
function matchParen(src, openIdx) {
    let depth = 0;
    for (let i = openIdx; i < src.length; i++) {
        const c = src[i];
        if (c === '"' || c === "'") { i = skipQuoted(src, i) - 1; continue; }
        if (c === '`') { i = skipTemplate(src, i) - 1; continue; }
        if (c === '(') depth++;
        else if (c === ')' && --depth === 0) return i + 1;
    }
    return src.length;
}
// Named function bodies: [{name, start, end}] (declarations, function expressions, arrows).
function functionRanges(src) {
    const out = [];
    const decl = /\b(?:async\s+)?function\s*\*?\s*([A-Za-z_$][\w$]*)\s*\(/g;
    const assigned = /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s+)?(function\b\s*\*?\s*[\w$]*\s*\(|\(|[A-Za-z_$][\w$]*\s*=>)/g;
    let m;
    while ((m = decl.exec(src))) {
        const pEnd = matchParen(src, m.index + m[0].length - 1);
        const open = src.indexOf('{', pEnd);
        if (open >= 0) out.push({ name: m[1], start: m.index, end: matchBrace(src, open) });
    }
    while ((m = assigned.exec(src))) {
        let i = m.index + m[0].length;
        if (m[2].endsWith('(')) {
            i = matchParen(src, i - 1);
            if (!m[2].startsWith('function')) {
                const arrow = /^\s*=>\s*/.exec(src.slice(i));
                if (!arrow) continue;          // `const x = (a + b)` — not a function
                i += arrow[0].length;
            }
        } else {
            i = src.indexOf('=>', m.index + m[1].length) + 2;
        }
        while (/\s/.test(src[i])) i++;
        if (src[i] === '{') out.push({ name: m[1], start: m.index, end: matchBrace(src, i) });
        else {
            const stop = src.slice(i).search(/;|\n(?!\s*[.?:)])/);
            out.push({ name: m[1], start: m.index, end: stop < 0 ? src.length : i + stop });
        }
    }
    return out;
}

// ---------------------------------------------------------------------------------------------
// Shared inputs
// ---------------------------------------------------------------------------------------------
const TYPES = ['club', 'food', 'fun', 'spa', 'golf', 'store'];
const ENUMS = {
    area: ['joia', 'tierra', 'partner', 'island'],
    channel: ['in-house', 'off-site', 'both'],
    status: ['', 'coming-soon']
};
const SUBSETS = {
    meals: ['breakfast', 'lunch', 'dinner', 'drinks'],
    featured: ['morning', 'day', 'sunset', 'night']
};
// §B6 hours grammar — must stay identical to HOURS_RE in js/lib.js and js/admin.js (checked below).
const HOURS_RE = /^(?:(\w[\w &]*?)\s+)?(?:(\d{1,2}:\d{2})-(\d{1,2}:\d{2})|from\s+(\d{1,2}:\d{2}))(?:\s+(Mon|Tue|Wed|Thu|Fri|Sat|Sun)(?:-(Mon|Tue|Wed|Thu|Fri|Sat|Sun))?)?$/;
const KNOWN_FIELDS = new Set([
    // core
    'type', 'title', 'sub', 'desc', 'gallery', 'video', 'pdf', 'pdfs', 'partnerLogo', 'duration', 'time', 'itinerary', 'essentials',
    // optional guest-app fields (§B10)
    'logo', 'area', 'cuisine', 'meals', 'hours', 'tags', 'priceFrom', 'phone', 'whatsapp', 'bookUrl', 'bookingNote',
    'address', 'channel', 'featured', 'status', 'iberocash', 'order'
]);
const IMAGE_EXT = /\.(jpe?g|png|webp|gif)$/i;

const dataRes = loadGlobal('js/data.js', 'defaultData');
const data = dataRes.value && typeof dataRes.value === 'object' && !Array.isArray(dataRes.value) ? dataRes.value : null;
const appJs = read('js/app.js');
const adminJs = read('js/admin.js');
const swJs = read('sw.js');

function todayHeroes(src) {
    if (!src) return null;
    const m = /\bTODAY_HERO\s*=\s*([\[{][\s\S]*?[\]}])\s*;?\s*\n/.exec(src);
    if (!m) return null;
    return [...new Set([...m[1].matchAll(/['"`](assets\/[^'"`]+)['"`]/g)].map((x) => x[1]))];
}
const heroes = todayHeroes(appJs) || [];

// Every image the app may request at its original URL (gallery, logo, partnerLogo, Today heroes).
function referencedImages() {
    const out = new Map();     // path → [where]
    const add = (p, where) => { if (typeof p === 'string' && p && IMAGE_EXT.test(p) && !EXTERNAL_URL.test(p)) (out.get(p) || out.set(p, []).get(p)).push(where); };
    if (data) for (const [key, item] of Object.entries(data)) {
        if (!item || typeof item !== 'object') continue;
        (Array.isArray(item.gallery) ? item.gallery : []).forEach((p) => add(p, `${key}.gallery`));
        add(item.logo, `${key}.logo`);
        add(item.partnerLogo, `${key}.partnerLogo`);
    }
    heroes.forEach((p) => add(p, 'TODAY_HERO'));
    return out;
}

// =============================================================================================
console.log(bold('Iberostar Aruba — verify') + dim(`  (${root})`));

// ---------------------------------------------------------------------------------------------
// 1. Asset paths (original check 1, + logo, exact case, Today heroes)
// ---------------------------------------------------------------------------------------------
check('1. Asset paths', () => {
    if (!data) {
        fail(dataRes.missing ? 'js/data.js not found' : `js/data.js could not be evaluated: ${dataRes.error && dataRes.error.message}`);
        return;
    }
    let refs = 0;
    const f0 = cur.fails;
    function checkRef(key, field, p) {
        refs++;
        if (typeof p !== 'string' || !p.trim()) return fail(`${key}: ${field} must be a non-empty path string (got ${JSON.stringify(p)})`);
        if (EXTERNAL_URL.test(p)) return fail(`${key}: ${field} is a URL (${p}) — every media path must be a local file under assets/`);
        if (p.startsWith('/')) return fail(`${key}: ${field} starts with "/" (${p}) — that breaks under the /iberostar-club/ GitHub Pages path; use a relative path`);
        if (p.includes('\\')) return fail(`${key}: ${field} uses backslashes (${p}) — use forward slashes`);
        if (p !== p.trim()) return fail(`${key}: ${field} has leading/trailing spaces: ${JSON.stringify(p)}`);
        const st = fileStatus(p);
        if (st !== 'ok') fail(`${key}: ${field} ${STATUS_TEXT[st]}: ${p}`);
    }
    for (const [key, item] of Object.entries(data)) {
        if (!item || typeof item !== 'object' || Array.isArray(item)) { fail(`${key}: entry is not an object`); continue; }
        ['title', 'type', 'desc', 'sub'].forEach((field) => {
            if (!item[field]) fail(`${key}: missing required field "${field}"`);
        });
        if (item.gallery !== undefined && !Array.isArray(item.gallery)) fail(`${key}: gallery must be an array of paths`);
        (Array.isArray(item.gallery) ? item.gallery : []).forEach((p, i) => checkRef(key, `gallery[${i}]`, p));
        ['pdf', 'video', 'partnerLogo', 'logo'].forEach((f) => { if (item[f]) checkRef(key, f, item[f]); });
        if (item.pdfs !== undefined && !Array.isArray(item.pdfs)) fail(`${key}: pdfs must be an array of {label, url}`);
        (Array.isArray(item.pdfs) ? item.pdfs : []).forEach((p, i) => {
            if (!p || typeof p !== 'object') return fail(`${key}: pdfs[${i}] must be an object {label, url}`);
            if (!p.label || typeof p.label !== 'string') fail(`${key}: a pdfs[] entry is missing a label`);
            checkRef(key, `pdfs[${i}].url`, p.url);
        });
    }
    if (cur.fails === f0) ok(`asset integrity — ${plural(Object.keys(data).length, 'item')}, ${plural(refs, 'file reference')} (gallery, logo, partnerLogo, pdf, pdfs, video), all present`);

    if (!appJs) return;
    if (!heroes.length) { warn('could not find TODAY_HERO in js/app.js (§B5.1) — Today hero photos not checked'); return; }
    const bad = heroes.filter((p) => fileStatus(p) !== 'ok');
    bad.forEach((p) => fail(`TODAY_HERO (js/app.js): ${p} ${STATUS_TEXT[fileStatus(p)]}`));
    if (!bad.length) ok(`Today hero photos exist (${heroes.length})`);
});

// ---------------------------------------------------------------------------------------------
// 2. Optional-field validation (§B10 table, §B6 hours grammar)
// ---------------------------------------------------------------------------------------------
check('2. Optional fields', () => {
    if (!data) { fail('js/data.js not loaded — skipped'); return; }
    const f0 = cur.fails, w0 = cur.warns;
    const isStrArr = (v) => Array.isArray(v) && v.every((s) => typeof s === 'string');
    let optionalCount = 0;
    const titles = new Map();
    for (const [key, item] of Object.entries(data)) {
        if (!item || typeof item !== 'object') continue;
        const at = (f) => `${key}.${f}`;
        if (!TYPES.includes(item.type)) fail(`${at('type')} = ${JSON.stringify(item.type)} — must be one of ${TYPES.join(', ')} (the app drops any other entry)`);
        ['title', 'sub', 'desc', 'duration', 'time', 'pdf', 'video', 'partnerLogo', 'logo', 'cuisine', 'bookingNote', 'address', 'phone']
            .forEach((f) => { if (item[f] !== undefined && typeof item[f] !== 'string') fail(`${at(f)} must be a string (got ${typeof item[f]})`); });
        ['itinerary', 'essentials', 'tags'].forEach((f) => {
            if (item[f] !== undefined && !isStrArr(item[f])) fail(`${at(f)} must be an array of strings (one entry per item)`);
        });
        for (const [f, allowed] of Object.entries(ENUMS)) {
            if (item[f] === undefined) continue;
            optionalCount++;
            if (!allowed.includes(item[f])) fail(`${at(f)} = ${JSON.stringify(item[f])} — must be one of ${allowed.map((x) => JSON.stringify(x)).join(' | ')}`);
        }
        for (const [f, allowed] of Object.entries(SUBSETS)) {
            if (item[f] === undefined) continue;
            optionalCount++;
            if (!Array.isArray(item[f])) { fail(`${at(f)} must be an array, a subset of [${allowed.join(', ')}]`); continue; }
            const badVals = item[f].filter((x) => !allowed.includes(x));
            if (badVals.length) fail(`${at(f)} contains ${badVals.map((x) => JSON.stringify(x)).join(', ')} — allowed: ${allowed.join(', ')}`);
            if (new Set(item[f]).size !== item[f].length) warn(`${at(f)} lists a value twice`);
        }
        if (item.hours !== undefined) {
            optionalCount++;
            if (!isStrArr(item.hours)) fail(`${at('hours')} must be an array of strings, e.g. ["Dinner 17:00-23:00", "Lunch 11:00-17:00 Mon-Sat"]`);
            else item.hours.forEach((line, i) => {
                const m = HOURS_RE.exec(line.trim());
                if (!m) return warn(`${at(`hours[${i}]`)} "${line}" doesn't match the hours grammar — the app shows it as plain text with no open/closed status (format: "[Label] HH:MM-HH:MM [Mon[-Sun]]" or "[Label] from HH:MM")`);
                const badTime = [m[2], m[3], m[4]].filter(Boolean).find((t) => { const [h, mm] = t.split(':').map(Number); return h > 24 || mm > 59 || (h === 24 && mm > 0); });
                if (badTime) warn(`${at(`hours[${i}]`)} "${line}" has an impossible time ${badTime}`);
            });
        }
        if (item.tags !== undefined) optionalCount++;
        ['priceFrom', 'order'].forEach((f) => {
            if (item[f] === undefined) return;
            optionalCount++;
            if (typeof item[f] !== 'number' || !Number.isFinite(item[f])) fail(`${at(f)} must be a number (got ${JSON.stringify(item[f])}) — no "$" or quotes`);
            else if (f === 'priceFrom' && item[f] < 0) fail(`${at(f)} must not be negative`);
        });
        if (item.whatsapp !== undefined) {
            optionalCount++;
            if (typeof item.whatsapp !== 'string' || !/^\d+$/.test(item.whatsapp)) fail(`${at('whatsapp')} must be digits only, country code first, no "+", spaces or dashes (got ${JSON.stringify(item.whatsapp)})`);
            else if (item.whatsapp.length < 7 || item.whatsapp.length > 15) warn(`${at('whatsapp')} "${item.whatsapp}" is ${item.whatsapp.length} digits — international numbers are 7–15 digits incl. country code`);
        }
        if (typeof item.phone === 'string' && item.phone) {
            optionalCount++;
            if (!/^\+[1-9]\d{6,14}$/.test(item.phone)) warn(`${at('phone')} "${item.phone}" is not E.164 (e.g. "+2975878021") — tel: links may not dial correctly`);
        }
        if (item.bookUrl !== undefined) {
            optionalCount++;
            let okUrl = false;
            try { okUrl = typeof item.bookUrl === 'string' && /^https?:$/.test(new URL(item.bookUrl).protocol); } catch (e) { /* invalid */ }
            if (!okUrl) fail(`${at('bookUrl')} must be an absolute http(s) URL (got ${JSON.stringify(item.bookUrl)})`);
        }
        if (item.iberocash !== undefined) {
            optionalCount++;
            if (typeof item.iberocash !== 'boolean') fail(`${at('iberocash')} must be true or false (got ${JSON.stringify(item.iberocash)})`);
        }
        const unknown = Object.keys(item).filter((f) => !KNOWN_FIELDS.has(f));
        if (unknown.length) warn(`${key}: unknown field${unknown.length > 1 ? 's' : ''} ${unknown.map((f) => `"${f}"`).join(', ')} — ignored by the app (typo?)`);
        if (typeof item.title === 'string') {
            const t = item.title.trim().toLowerCase();
            (titles.get(t) || titles.set(t, []).get(t)).push(key);
        }
    }
    for (const [t, keys] of titles) if (keys.length > 1) warn(`duplicate title "${data[keys[0]].title}" on ${keys.join(', ')} — guests can't tell them apart in search`);
    if (cur.fails === f0) ok(`types and optional fields valid — ${plural(optionalCount, 'optional value')} checked across ${plural(Object.keys(data).length, 'item')}${cur.warns > w0 ? ' (see warnings)' : ''}`);

    // The hours grammar is copied verbatim in three places; drift means admin's preview lies.
    const want = HOURS_RE.toString();
    for (const rel of ['js/lib.js', 'js/admin.js']) {
        const src = read(rel);
        if (src == null) continue;
        const line = src.split('\n').find((l) => l.includes('(Mon|Tue|Wed|Thu|Fri|Sat|Sun)'));
        const lit = line && /\/\^.*\$\/[a-z]*/.exec(line);
        if (!lit) warn(`${rel}: no hours regex found (§B6 hours grammar) — can't confirm it matches verify.js`);
        else if (lit[0] !== want) warn(`${rel}: hours regex differs from the §B6 grammar in verify.js:\n      ${lit[0]}\n    vs ${want}`);
    }
});

// ---------------------------------------------------------------------------------------------
// 3. Item keys are URL segments
// ---------------------------------------------------------------------------------------------
check('3. Item keys', () => {
    if (!data) { fail('js/data.js not loaded — skipped'); return; }
    const bad = Object.keys(data).filter((k) => !/^[A-Za-z0-9_-]+$/.test(k));
    bad.forEach((k) => fail(`key ${JSON.stringify(k)} must match ^[A-Za-z0-9_-]+$ (keys appear in #/item/<key> links)`));
    if (!bad.length) ok(`${plural(Object.keys(data).length, 'key')} match ^[A-Za-z0-9_-]+$`);
});

// ---------------------------------------------------------------------------------------------
// 4. Version sync (original check 2, + sw.js and every ?v=)
// ---------------------------------------------------------------------------------------------
check('4. Version sync', () => {
    const appVer = appJs && /\bDATA_VERSION\s*=\s*(\d+)/.exec(appJs)?.[1];
    const adminVer = adminJs && /\bDATA_VERSION\s*=\s*(\d+)/.exec(adminJs)?.[1];
    if (!appVer || !adminVer) {
        fail('could not find DATA_VERSION in js/app.js and/or js/admin.js');
        return;
    }
    if (appVer !== adminVer) fail(`DATA_VERSION mismatch — js/app.js=${appVer}, js/admin.js=${adminVer} (they must match, or returning visitors keep stale cached data)`);
    const want = appVer;
    const f0 = cur.fails;
    const seen = [];
    if (swJs != null) {
        const swVer = /(?<![\w$])VERSION\s*=\s*(\d+)/.exec(swJs)?.[1];
        if (!swVer) fail('sw.js: could not find `const VERSION = <n>`');
        else if (swVer !== want) fail(`sw.js VERSION=${swVer} but DATA_VERSION=${want} — guests keep the old cached shell until these match`);
        else seen.push('sw.js');
        for (const m of swJs.matchAll(/[?&]v=(\d+)/g)) {
            if (m[1] !== want) fail(`sw.js line ${lineIndex(swJs)(m.index)}: literal ?v=${m[1]} ≠ ${want} (prefer ?v=\${VERSION})`);
        }
    } else note('sw.js not present — skipped');

    let vCount = 0;
    for (const rel of ['index.html', 'admin.html']) {
        const raw = read(rel);
        if (raw == null) { fail(`${rel} not found`); continue; }
        const html = maskHtml(raw, { keepScripts: true });
        const line = lineIndex(html);
        for (const m of html.matchAll(/([^\s"'()<>=,`]*)[?&]v=([^&"'\s<>#)`,]*)/g)) {
            if (EXTERNAL_URL.test(m[1])) continue;
            vCount++;
            if (m[2] !== want) fail(`${rel} line ${line(m.index)}: ${m[1]}?v=${m[2]} ≠ DATA_VERSION ${want}`);
        }
        // Local scripts and stylesheets must be cache-busted, or the SW shell and the page disagree.
        for (const t of tagsOf(maskHtml(raw))) {
            const url = t.name === 'script' ? t.get('src')
                : t.name === 'link' && /(^|\s)stylesheet(\s|$)/i.test(t.get('rel') || '') ? t.get('href') : null;
            if (!url || EXTERNAL_URL.test(url)) continue;
            if (!/[?&]v=/.test(url)) fail(`${rel} line ${line(t.offset)}: ${url} has no ?v=${want} — returning guests may run a stale cached copy`);
        }
        seen.push(rel);
    }
    if (cur.fails === f0 && appVer === adminVer) ok(`DATA_VERSION in sync — ${want} (app.js, admin.js, ${seen.join(', ')}; ${plural(vCount, 'local ?v= reference')})`);

    // sw.js shell list must resolve, and its TODAY_HERO mirror must match app.js.
    if (swJs == null) return;
    const shellLit = /\bSHELL_URLS\s*=\s*(\[[\s\S]*?\])\s*;/.exec(swJs);
    if (!shellLit) { warn('sw.js: SHELL_URLS not found — shell file list not checked'); return; }
    let shell;
    try { shell = vm.runInNewContext(`const VERSION = ${want}; ${shellLit[1]}`, {}, { timeout: 1000 }); } catch (e) {
        shell = [...shellLit[1].matchAll(/['"]([^'"]+)['"]/g)].map((x) => x[1]);
    }
    const missing = [];
    for (const u of shell) {
        const lp = localUrlPath(u);
        if (!lp || lp.abs) continue;
        if (lp.path === 'js/media.js') continue;             // optional by design (§A.1), see check 5
        const st = fileStatus(lp.path);
        if (st !== 'ok') missing.push(`${u} (${st})`);
    }
    missing.forEach((u) => fail(`sw.js SHELL_URLS: ${u} — the shell precache can't complete with a missing file`));
    if (!missing.length) ok(`sw.js shell — ${plural(shell.length, 'URL')} resolve`);
    const swHeroes = todayHeroes(swJs);
    if (swHeroes && heroes.length && swHeroes.slice().sort().join() !== heroes.slice().sort().join()) {
        warn(`sw.js TODAY_HERO (${swHeroes.join(', ')}) differs from js/app.js (${heroes.join(', ')}) — the "warm" message caches the wrong hero`);
    }
    const py = read('scripts/build-images.py');
    if (py && heroes.length) {
        const m = /TODAY_HERO\s*=\s*([\[({][\s\S]*?[\])}])/.exec(py);
        const pyHeroes = m ? [...new Set([...m[1].matchAll(/['"](assets\/[^'"]+)['"]/g)].map((x) => x[1]))] : null;
        if (pyHeroes && pyHeroes.slice().sort().join() !== heroes.slice().sort().join()) {
            warn(`scripts/build-images.py TODAY_HERO differs from js/app.js — re-sync it and re-run the pipeline`);
        }
    }
});

// ---------------------------------------------------------------------------------------------
// 5. Media pipeline output (§A.6), _dirs, .nojekyll
// ---------------------------------------------------------------------------------------------
check('5. Media', () => {
    // GitHub Pages runs Jekyll, which silently drops _-prefixed directories.
    const underscore = [];
    if (fileStatus('assets') !== 'dir') { fail('assets/ directory not found'); return; }
    (function walk(rel) {
        for (const ent of fs.readdirSync(abs(rel), { withFileTypes: true })) {
            if (!ent.isDirectory()) continue;
            const child = `${rel}/${ent.name}`;
            if (ent.name.startsWith('_')) underscore.push(child);
            walk(child);
        }
    })('assets');
    underscore.forEach((d) => fail(`${d}/ starts with "_" — GitHub Pages (Jekyll) silently drops it; rename the directory`));
    if (fileStatus('.nojekyll') !== 'ok') fail('.nojekyll is missing at the repo root (§A.1) — add an empty file so GitHub Pages serves files verbatim');
    if (!underscore.length && fileStatus('.nojekyll') === 'ok') ok('no _-prefixed directories under assets/, .nojekyll present');

    const refs = referencedImages();
    const mediaRes = loadGlobal('js/media.js', 'MEDIA');
    if (mediaRes.missing) {
        const big = [...refs.keys()].filter((p) => sizeOf(p) > 400e3);
        const total = [...refs.keys()].reduce((s, p) => s + sizeOf(p), 0);
        warn(`js/media.js not found — the app serves originals (${plural(refs.size, 'referenced image')}, ${fmtKB(total)}; ${big.length} over 400 KB). Run: python3 scripts/build-images.py`);
        return;
    }
    if (mediaRes.error) { fail(`js/media.js could not be evaluated: ${mediaRes.error.message}`); return; }
    const MEDIA = mediaRes.value;
    if (!MEDIA.img || typeof MEDIA.img !== 'object') { fail('js/media.js: MEDIA.img missing'); return; }

    // Every entry: id hash suffix == sha1(original)[:8]; every listed width exists; v ascending.
    const f0 = cur.fails;
    const expected = new Set();
    let variants = 0, hashed = 0;
    for (const [p, m] of Object.entries(MEDIA.img)) {
        if (!m || typeof m.id !== 'string') { fail(`MEDIA.img["${p}"]: missing id`); continue; }
        const h = /-([0-9a-f]{8})$/.exec(m.id);
        if (!h) fail(`MEDIA.img["${p}"]: id "${m.id}" doesn't end in -<8 hex sha1 chars>`);
        const st = fileStatus(p);
        if (st !== 'ok') {
            if (!refs.has(p)) warn(`MEDIA.img["${p}"]: original ${STATUS_TEXT[st]} — stale entry (re-run build-images.py)`);
        } else if (h) {
            hashed++;
            const sha = crypto.createHash('sha1').update(fs.readFileSync(abs(p))).digest('hex').slice(0, 8);
            if (sha !== h[1]) fail(`${p} changed after build-images.py ran (id hash ${h[1]}, file hash ${sha}) — re-run python3 scripts/build-images.py`);
        }
        if (!Array.isArray(m.v) || !m.v.length || !m.v.every((w) => Number.isInteger(w) && w > 0)) { fail(`MEDIA.img["${p}"]: v must be a non-empty array of widths`); continue; }
        if (m.v.some((w, i) => i && w <= m.v[i - 1])) fail(`MEDIA.img["${p}"]: v [${m.v}] must be sorted ascending (pickW relies on it)`);
        for (const w of m.v) {
            const out = `assets/img/${m.id}-${w}.webp`;
            expected.add(out);
            variants++;
            const vs = fileStatus(out);
            if (vs !== 'ok') fail(`${out} (MEDIA.img["${p}"], ${w}w) ${STATUS_TEXT[vs]}`);
        }
        if (m.q !== undefined && !/^data:image\/(webp|jpeg|png);base64,/.test(String(m.q))) warn(`MEDIA.img["${p}"].q is not a base64 image data URI`);
    }
    let posters = 0;
    for (const [p, v] of Object.entries(MEDIA.video || {})) {
        if (!v || !v.poster) { warn(`MEDIA.video["${p}"] has no poster`); continue; }
        posters++;
        const lp = localUrlPath(v.poster);
        expected.add(lp ? lp.path : v.poster);
        const st = lp ? fileStatus(lp.path) : 'missing';
        if (st !== 'ok') fail(`MEDIA.video["${p}"].poster ${STATUS_TEXT[st]}: ${v.poster}`);
    }
    if (cur.fails === f0) ok(`media.js — ${plural(Object.keys(MEDIA.img).length, 'image entry', 'image entries')} (${hashed} hashes match), ${plural(variants, 'derivative')} and ${plural(posters, 'poster')} present`);

    // Coverage: a missing entry is only a warning, so an admin-added photo never blocks a deploy.
    const uncovered = [...refs.keys()].filter((p) => !MEDIA.img[p] && fileStatus(p) === 'ok');
    uncovered.forEach((p) => {
        const size = sizeOf(p);
        warn(`no MEDIA entry for ${p} (${refs.get(p)[0]})${size > 400e3 ? ` — ${fmtKB(size)} original served to guests` : ''}; re-run build-images.py`);
    });
    if (!uncovered.length) ok(`every gallery/logo/partnerLogo/hero image (${refs.size}) has a MEDIA entry`);

    // Orphaned derivatives (old hashes) — just bloat; safe to delete.
    if (fs.existsSync(abs('assets/img'))) {
        const orphans = fs.readdirSync(abs('assets/img')).filter((f) => !expected.has(`assets/img/${f}`) && !f.startsWith('.'));
        if (orphans.length) warn(`${plural(orphans.length, 'file')} in assets/img/ not referenced by media.js (e.g. ${orphans.slice(0, 3).join(', ')}) — stale derivatives, safe to delete`);
    }
});

// ---------------------------------------------------------------------------------------------
// 6. CSS lint (styles.css, admin.css), including the original safe-area cascade check
// ---------------------------------------------------------------------------------------------
const cssCache = new Map();
function css(rel) {
    if (!cssCache.has(rel)) { const raw = read(rel); cssCache.set(rel, raw == null ? null : parseCss(raw)); }
    return cssCache.get(rel);
}
const OUTLINE_OFF = (d) => (d.prop === 'outline' && /^(none|0(\.0+)?[a-z%]*|\.0+[a-z%]*)$/i.test(d.value))
    || (d.prop === 'outline-style' && /^none$/i.test(d.value))
    || (d.prop === 'outline-width' && /^0(\.0+)?[a-z%]*$/i.test(d.value));
// Draws a ring by itself: outline-color/-width alone don't (the style may still be `none`).
const RING_ON = (d) => (/^(outline|outline-style)$/.test(d.prop) && !OUTLINE_OFF(d) && !/^(none|0|hidden)$/i.test(d.value))
    || (d.prop === 'box-shadow' && !/^none$/i.test(d.value));
const INFINITE_ALLOW = /\.(today-hero|star|spinner)(?![A-Za-z0-9])/;
const OVERSHOOT_BANNED = [0.175, 0.885, 0.32, 1.275];

function lintCss(rel) {
    const sheet = css(rel);
    const f0 = cur.fails;
    const { rules, text, line } = sheet;
    const where = (r) => `${rel}:${line(r.start)}`;

    // a) at least one :focus-visible rule
    const focusRules = rules.filter((r) => r.selectors.some((s) => s.includes(':focus-visible')) && r.decls.some(RING_ON));
    if (!focusRules.length) fail(`${rel}: no :focus-visible rule draws a focus ring (outline/box-shadow) — keyboard users can't see focus`);

    // b) outline removed outside :focus:not(:focus-visible) — unless the ring is redrawn for that
    //    element via its own :focus-visible rule elsewhere (e.g. .card:has(.card__link:focus-visible)).
    for (const r of rules) {
        const off = r.decls.find(OUTLINE_OFF);
        if (!off) continue;
        for (const s of r.selectors) {
            if (/:not\(\s*:focus-visible\s*\)/.test(s)) continue;
            const base = s.replace(/:focus(-visible|-within)?\b/g, '').trim();
            const relocated = base && base !== '*' && rules.some((r2) => r2 !== r
                && r2.selectors.some((s2) => s2.includes(base + ':focus-visible')) && r2.decls.some(RING_ON));
            if (relocated) continue;
            fail(`${rel}:${line(off.offset)} "${s}" sets ${off.prop}:${off.value} — removes the keyboard focus ring. Drop it (the global :focus:not(:focus-visible) rule already hides it for mouse/touch) or scope it to ":focus:not(:focus-visible)"`);
        }
    }

    // c) device-class branching on body (the dead `body.keyboard-open .device-mobile nav` class of bug)
    for (const r of rules) for (const s of r.selectors) {
        if (/body[^,{]*\.device-/.test(s)) fail(`${where(r)} selector "${s}" — .device-* classes live on <html>, so this never matches`);
    }

    // d) infinite animations only on the allowlist (§C.4: Ken Burns + night twinkles; spinner)
    for (const r of rules) {
        const inf = r.decls.find((d) => (d.prop === 'animation' || d.prop === '-webkit-animation') && /\binfinite\b/i.test(d.value)
            || /^(-webkit-)?animation-iteration-count$/.test(d.prop) && /\binfinite\b/i.test(d.value));
        if (!inf) continue;
        for (const s of r.selectors) {
            if (!INFINITE_ALLOW.test(s)) fail(`${rel}:${line(inf.offset)} "${s}" runs an infinite animation — only .today-hero, .star and .spinner may (idle CPU/battery budget, §C.4)`);
        }
    }

    // e) no overshoot easing
    for (const m of text.matchAll(/cubic-bezier\(([^)]*)\)/gi)) {
        const nums = m[1].split(',').map((x) => parseFloat(x));
        if (nums.length !== 4 || nums.some(Number.isNaN)) continue;
        if (nums.every((x, i) => Math.abs(x - OVERSHOOT_BANNED[i]) < 1e-6)) fail(`${rel}:${line(m.index)} cubic-bezier(${m[1]}) — overshoot easing is banned (§B11); use var(--ease-out)`);
        else if (nums[1] < 0 || nums[1] > 1 || nums[3] < 0 || nums[3] > 1) warn(`${rel}:${line(m.index)} cubic-bezier(${m[1]}) overshoots (y outside 0–1) — motion should be decelerating only (§B1)`);
    }

    // f) weight 800+ and monospace are not used anywhere (§B1 typography roles)
    for (const r of rules) for (const d of r.decls) {
        if ((d.prop === 'font-weight' && /^(800|900)$/.test(d.value)) || (d.prop === 'font' && /(^|\s)(800|900)(\s|$)/.test(d.value))) {
            warn(`${rel}:${line(d.offset)} "${r.selectorText}" uses weight ${/(800|900)/.exec(d.value)[1]} — not part of the type system and no such font file is loaded`);
        }
        if (/^(font|font-family)$/.test(d.prop) && /\bmonospace\b/i.test(d.value)) warn(`${rel}:${line(d.offset)} "${r.selectorText}" uses monospace — not part of the type system (use tabular-nums)`);
    }

    // g) safe-area cascade (original check 3, now order-aware and covering padding-block/margin):
    //    a selector that opts into notch clearance with padding-top: calc(var(--safe-top) …) must not
    //    have a later rule (e.g. inside a media query) that resets the shorthand without it.
    const SAFE = /--safe-top|safe-area-inset-top/;
    const safeSelectors = new Set();
    let cascadeBugs = 0;
    for (const box of ['padding', 'margin']) {
        const longs = [`${box}-top`, `${box}-block-start`];
        const shorts = [box, `${box}-block`];
        const relevant = (d) => longs.includes(d.prop) || shorts.includes(d.prop);
        const first = new Map();
        rules.forEach((r) => r.decls.forEach((d) => {
            if (relevant(d) && SAFE.test(d.value)) r.selectors.forEach((s) => { if (!first.has(s)) first.set(s, r.idx); });
        }));
        first.forEach((_, s) => safeSelectors.add(s));
        for (const r of rules) for (const s of r.selectors) {
            if (!first.has(s) || r.idx < first.get(s)) continue;
            const last = r.decls.filter(relevant).pop();
            if (last && shorts.includes(last.prop) && !SAFE.test(last.value)) {
                cascadeBugs++;
                fail(`${rel}:${line(last.offset)} "${s}" sets ${last.prop}: ${last.value} after a rule that relies on safe-area clearance (${box}-top: … var(--safe-top) …) — this silently drops notch/Dynamic Island padding; re-declare ${box}-top in this rule`);
            }
        }
    }
    if (!cascadeBugs) ok(`${rel}: safe-area cascade — ${plural(safeSelectors.size, 'selector')} using --safe-top, no shorthand silently overrides them`);
    if (cur.fails === f0) ok(`${rel}: ${plural(focusRules.length, ':focus-visible rule')}, no stray outline removal, no body .device- selectors, infinite animations allowlisted, no overshoot easing`);
}

check('6. CSS lint', () => {
    if (!css('css/styles.css')) fail('css/styles.css not found');
    else lintCss('css/styles.css');
    if (!css('css/admin.css')) warn('css/admin.css not found — skipped (admin.html must not load styles.css, §D2)');
    else lintCss('css/admin.css');
});

// ---------------------------------------------------------------------------------------------
// 7. HTML lint: zoom allowed, no inline handlers, every local reference exists
// ---------------------------------------------------------------------------------------------
check('7. HTML lint', () => {
    const pages = ['index.html', 'admin.html', 'qr.html'];
    for (const rel of pages) {
        const raw = read(rel);
        if (raw == null) { (rel === 'qr.html' ? warn : fail)(`${rel} not found`); continue; }
        const f0 = cur.fails;
        const masked = maskHtml(raw);
        const line = lineIndex(raw);
        const tags = tagsOf(masked);

        const vp = tags.find((t) => t.name === 'meta' && (t.get('name') || '').toLowerCase() === 'viewport');
        if (!vp) fail(`${rel}: no <meta name="viewport">`);
        else {
            const c = (vp.get('content') || '').toLowerCase();
            if (/user-scalable\s*=\s*(no|0)/.test(c)) fail(`${rel}:${line(vp.offset)} viewport has user-scalable=no — zoom must stay enabled (WCAG 1.4.4)`);
            if (/maximum-scale/.test(c)) fail(`${rel}:${line(vp.offset)} viewport sets maximum-scale — zoom must stay enabled (WCAG 1.4.4)`);
        }

        let refs = 0;
        for (const t of tags) {
            for (const a of t.attrs) {
                if (/^on[a-z]+$/.test(a.name)) fail(`${rel}:${line(a.offset)} <${t.name} ${a.name}="…"> — inline handlers are banned; wire it with addEventListener`);
                if (/^\s*javascript:/i.test(a.value)) fail(`${rel}:${line(a.offset)} <${t.name} ${a.name}="javascript:…"> — use a button + addEventListener`);
            }
            const urls = [];
            ['src', 'href', 'poster', 'data'].forEach((n) => { const v = t.get(n); if (v != null) urls.push(v); });
            const ss = t.get('srcset') || t.get('imagesrcset');
            if (ss) ss.split(',').forEach((c) => { const u = c.trim().split(/\s+/)[0]; if (u) urls.push(u); });
            if (t.name === 'meta' && /^(og:image|twitter:image|msapplication-\w+)$/i.test(t.get('property') || t.get('name') || '')) urls.push(t.get('content') || '');
            for (const u of urls) {
                const lp = localUrlPath(u);
                if (!lp) continue;
                refs++;
                if (lp.abs) { fail(`${rel}:${line(t.offset)} ${u} is root-absolute — breaks under the /iberostar-club/ GitHub Pages path`); continue; }
                if (lp.path === 'js/media.js') continue;   // optional by design; see check 5
                const st = fileStatus(lp.path);
                if (st !== 'ok') fail(`${rel}:${line(t.offset)} <${t.name}> ${u} ${STATUS_TEXT[st]}`);
            }
            // Web app manifest: valid JSON and its icons exist.
            if (t.name === 'link' && (t.get('rel') || '').toLowerCase() === 'manifest') {
                const lp = localUrlPath(t.get('href') || '');
                const src = lp && !lp.abs ? read(lp.path) : null;
                if (src == null) continue;
                let man;
                try { man = JSON.parse(src); } catch (e) { fail(`${lp.path} is not valid JSON: ${e.message}`); continue; }
                const dir = path.posix.dirname(lp.path);
                [...(man.icons || []), ...(man.screenshots || []), ...(man.shortcuts || []).flatMap((s) => s.icons || [])].forEach((ic) => {
                    const ip = ic && localUrlPath(ic.src || '', dir);
                    if (!ip || ip.abs) return;
                    refs++;
                    const st = fileStatus(ip.path);
                    if (st !== 'ok') fail(`${lp.path}: icon ${ic.src} ${STATUS_TEXT[st]} — install prompts/home-screen icons break`);
                });
            }
        }
        if (cur.fails === f0) ok(`${rel}: zoom allowed, no inline on* handlers, ${plural(refs, 'local reference')} resolve`);
    }

    // String-built handlers in JS templates (e.g. `<img onerror="…">`) are banned too (§A.5, §B13).
    for (const rel of ['js/app.js', 'js/lib.js', 'js/image-utils.js', 'js/admin.js']) {
        const src = read(rel);
        if (src == null) continue;
        const code = src.replace(/\/\*[\s\S]*?\*\//g, blank).replace(/^[ \t]*\/\/.*$/gm, blank);
        const line = lineIndex(code);
        const hits = [...code.matchAll(/\son[a-z]+=\\?["'`]/g)];
        hits.forEach((m) => fail(`${rel}:${line(m.index)} builds an inline ${m[0].trim().replace(/=.*/, '')} handler into HTML — use delegated listeners`));
        if (!hits.length) ok(`${rel}: no inline on* handlers in HTML templates`);
    }
});

// ---------------------------------------------------------------------------------------------
// 8. Token contrast (WCAG 2.x relative luminance; rgba composited over the real background)
// ---------------------------------------------------------------------------------------------
const NAMED = { white: '#ffffff', black: '#000000', transparent: 'rgba(0,0,0,0)', ivory: '#fffff0', navy: '#000080', gold: '#ffd700' };
function parseColor(str) {
    if (!str) return null;
    let s = String(str).trim().toLowerCase();
    if (NAMED[s]) s = NAMED[s];
    let m = /^#([0-9a-f]{3,8})$/.exec(s);
    if (m) {
        let h = m[1];
        if (h.length === 3 || h.length === 4) h = h.split('').map((c) => c + c).join('');
        if (h.length !== 6 && h.length !== 8) return null;
        return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16), a: h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1 };
    }
    m = /^(rgba?|hsla?)\(([^)]*)\)$/.exec(s);
    if (!m) return null;
    const parts = m[2].split(/[\s,\/]+/).filter(Boolean);
    if (parts.length < 3) return null;
    const alpha = parts[3] == null ? 1 : parts[3].endsWith('%') ? parseFloat(parts[3]) / 100 : parseFloat(parts[3]);
    if (m[1].startsWith('rgb')) {
        const ch = (x) => (x.endsWith('%') ? parseFloat(x) * 2.55 : parseFloat(x));
        const [r, g, b] = parts.slice(0, 3).map(ch);
        if ([r, g, b, alpha].some(Number.isNaN)) return null;
        return { r, g, b, a: alpha };
    }
    const hh = parseFloat(parts[0]) / 360, ss = parseFloat(parts[1]) / 100, ll = parseFloat(parts[2]) / 100;
    if ([hh, ss, ll, alpha].some(Number.isNaN)) return null;
    const q = ll < 0.5 ? ll * (1 + ss) : ll + ss - ll * ss, p = 2 * ll - q;
    const hue = (t) => { t = (t + 1) % 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < 1 / 2 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; };
    return { r: hue(hh + 1 / 3) * 255, g: hue(hh) * 255, b: hue(hh - 1 / 3) * 255, a: alpha };
}
const over = (fg, bg) => ({ r: fg.r * fg.a + bg.r * (1 - fg.a), g: fg.g * fg.a + bg.g * (1 - fg.a), b: fg.b * fg.a + bg.b * (1 - fg.a), a: 1 });
function luminance(c) {
    const lin = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    return 0.2126 * lin(c.r) + 0.7152 * lin(c.g) + 0.0722 * lin(c.b);
}
function contrast(a, b) { const la = luminance(a), lb = luminance(b); return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05); }
function resolveVars(value, vars, depth = 0) {
    if (value == null || depth > 12) return null;
    let out = '', i = 0;
    for (;;) {
        const j = value.indexOf('var(', i);
        if (j < 0) { out += value.slice(i); break; }
        out += value.slice(i, j);
        const end = matchParen(value, j + 3);
        const inner = value.slice(j + 4, end - 1);
        const parts = splitTop(inner, ',');
        const name = parts[0].text.trim();
        const fb = parts.length > 1 ? inner.slice(parts[1].start).trim() : null;
        const rep = vars[name] != null ? resolveVars(vars[name], vars, depth + 1) : fb != null ? resolveVars(fb, vars, depth + 1) : null;
        if (rep == null) return null;
        out += rep;
        i = end;
    }
    return out.trim();
}
const hexOf = (c) => '#' + [c.r, c.g, c.b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('').toUpperCase() + (c.a < 1 ? `@${+c.a.toFixed(2)}` : '');

function themeVars(sheet) {
    const rootVars = {}, themes = {};
    for (const r of sheet.rules) {
        if (r.chain.length) continue;
        for (const s of r.selectors) {
            const t = /^(?:html|:root)?\[data-theme\s*=\s*["']?(light|dark)["']?\]$/.exec(s);
            const target = t ? (themes[t[1]] = themes[t[1]] || {}) : (s === ':root' || s === 'html') ? rootVars : null;
            if (!target) continue;
            r.decls.forEach((d) => { if (d.prop.startsWith('--')) target[d.prop] = d.value; });
        }
    }
    return { rootVars, themes };
}

function contrastTheme(rel, theme, vars) {
    const f0 = cur.fails;
    const canvas = theme === 'dark' ? { r: 0, g: 0, b: 0, a: 1 } : { r: 255, g: 255, b: 255, a: 1 };
    const raw = (name) => { const v = resolveVars(`var(${name})`, vars); return v == null ? null : parseColor(v); };
    const bgBase = raw('--bg');
    if (!bgBase) { fail(`${rel} ${theme}: --bg is missing or not a plain colour`); return; }
    const bg = bgBase.a < 1 ? over(bgBase, canvas) : bgBase;
    const surface = raw('--surface') ? (raw('--surface').a < 1 ? over(raw('--surface'), bg) : raw('--surface')) : null;
    // A translucent background token is judged over every opaque surface it can sit on; worst case wins.
    const backdrops = (name) => {
        const c = raw(name);
        if (!c) return null;
        if (name === '--bg') return [bg];
        if (c.a >= 1) return [c];
        return [bg, surface].filter(Boolean).map((b) => over(c, b));
    };
    const pairs = new Map();
    const add = (fg, bgName, min, why) => { const k = `${fg}|${bgName}`; if (!pairs.has(k)) pairs.set(k, { fg, bg: bgName, min, why }); };
    for (const fg of ['--text', '--text-2', '--text-3', '--accent-text']) for (const b of ['--bg', '--surface', '--surface-2']) add(fg, b, 4.5, 'spec');
    add('--on-accent', '--accent', 4.5, 'spec');
    add('--open', '--open-bg', 4.5, 'spec');
    add('--warn', '--warn-bg', 4.5, 'spec');
    // Same naming convention elsewhere in the block: --on-X on --X, --X on --X-bg (e.g. on-ink/ink, danger/danger-bg).
    for (const name of Object.keys(vars)) {
        let m;
        if ((m = /^--on-(.+)$/.exec(name)) && vars[`--${m[1]}`] != null) add(name, `--${m[1]}`, 4.5, 'convention');
        if ((m = /^(--.+)-bg$/.exec(name)) && vars[m[1]] != null && /^--(open|warn|danger|error|ok|success|info|notice)/.test(m[1])) add(m[1], name, 4.5, 'convention');
    }
    add('--focus', '--bg', 3, 'focus');
    add('--focus', '--surface', 3, 'focus');

    let lowest = null, checked = 0;
    for (const p of pairs.values()) {
        const fgC = raw(p.fg);
        const bgs = backdrops(p.bg);
        if (!fgC || !bgs) {
            const missingName = !fgC ? p.fg : p.bg;
            const v = vars[missingName];
            if (p.why === 'spec') fail(`${rel} ${theme}: ${missingName} ${v == null ? 'is not defined' : `can't be parsed as a colour (${v})`}`);
            continue;
        }
        let worst = null;
        for (const b of bgs) {
            const f = fgC.a < 1 ? over(fgC, b) : fgC;
            const ratio = contrast(f, b);
            if (!worst || ratio < worst.ratio) worst = { ratio, f, b };
        }
        checked++;
        if (worst.ratio + 1e-9 < p.min) {
            fail(`${rel} ${theme}: ${p.fg} ${hexOf(fgC)} on ${p.bg} ${hexOf(worst.b)} = ${worst.ratio.toFixed(2)}:1 — needs ≥ ${p.min}:1${p.why === 'focus' ? ' (focus ring, WCAG 1.4.11)' : ''}`);
        }
        if (p.min === 4.5 && (!lowest || worst.ratio < lowest.ratio)) lowest = { ratio: worst.ratio, label: `${p.fg.slice(2)} on ${p.bg.slice(2)}` };
    }
    if (cur.fails === f0 && lowest) ok(`${rel} ${theme}: ${plural(checked, 'pair')} pass (text ≥ 4.5:1, focus ≥ 3:1); lowest ${lowest.ratio.toFixed(2)}:1 — ${lowest.label}`);
}

check('8. Token contrast', () => {
    const main = css('css/styles.css');
    if (!main) { fail('css/styles.css not found'); return; }
    const { rootVars, themes } = themeVars(main);
    for (const theme of ['light', 'dark']) {
        if (!themes[theme]) { fail(`css/styles.css: no html[data-theme="${theme}"] token block found (§B1)`); continue; }
        contrastTheme('css/styles.css', theme, { ...rootVars, ...themes[theme] });
    }
    const adm = css('css/admin.css');
    if (!adm) return;
    const a = themeVars(adm);
    const light = a.themes.light || (a.rootVars['--bg'] ? {} : null);
    if (!light) { warn('css/admin.css: no light token block found — contrast not checked'); return; }
    const aVars = { ...a.rootVars, ...light };
    contrastTheme('css/admin.css', 'light', aVars);
    // admin.css copies the §B1 light block; drift means staff preview colours the guest app doesn't use.
    if (themes.light) {
        const drift = Object.keys(themes.light).filter((k) => aVars[k] != null && aVars[k].replace(/\s+/g, '') !== themes.light[k].replace(/\s+/g, ''));
        if (drift.length) warn(`css/admin.css light tokens differ from css/styles.css: ${drift.join(', ')}`);
    }
});

// ---------------------------------------------------------------------------------------------
// 9. admin.js guards (§D1.1, §D1.2)
// ---------------------------------------------------------------------------------------------
check('9. admin.js guards', () => {
    if (adminJs == null) { fail('js/admin.js not found'); return; }
    const src = adminJs;
    const line = lineIndex(src);
    const fns = functionRanges(src);
    const save = fns.find((f) => f.name === 'saveItem');
    if (!save) fail('js/admin.js: saveItem() not found');
    else if (!/\.\.\.\s*\(?\s*appData\[key\]/.test(src.slice(save.start, save.end))) {
        fail(`js/admin.js:${line(save.start)} saveItem() must merge into the existing item — appData[key] = { ...(appData[key] || {}), ...fields } — or every staff save strips fields the form doesn't know (pdfs, hours, …)`);
    } else ok('saveItem() spread-merges into the existing item');

    // Comma splits/joins must never touch itinerary or essentials ("Coke, Coke Zero" corruption).
    const code = src.replace(/\/\*[\s\S]*?\*\//g, blank);
    const lines = code.split('\n');
    const LIST_FIELD = /itinerary|essentials/i;
    const ctx = (offset) => {
        const n = line(offset) - 1;
        let s = lines[n];
        if (n > 0 && /^\s*[.?:]/.test(s)) s = lines[n - 1] + s;          // chained call on the next line
        return s;
    };
    const hits = [];
    const commaOps = /\.(split|join)\(\s*(?:(['"`])\s*,\s*\2|\/(?:\\.|\[(?:\\.|[^\]\\])*\]|[^\/\\\n])*,(?:\\.|\[(?:\\.|[^\]\\])*\]|[^\/\\\n])*\/[a-z]*)\s*[,)]/g;
    for (const m of code.matchAll(commaOps)) {
        const op = m[1];
        if (LIST_FIELD.test(ctx(m.index))) { hits.push(`js/admin.js:${line(m.index)} ${op}s itinerary/essentials on commas — use one entry per line (/\\r?\\n/ and join('\\n'))`); continue; }
        // A helper that comma-splits, called with itinerary/essentials.
        const enclosing = fns.filter((f) => f.start <= m.index && m.index < f.end).sort((a, b) => (a.end - a.start) - (b.end - b.start))[0];
        if (!enclosing) continue;
        for (const call of code.matchAll(new RegExp(`(?<![\\w$.])${enclosing.name.replace(/\$/g, '\\$')}\\s*\\(`, 'g'))) {
            if (call.index === enclosing.start || (call.index >= enclosing.start && call.index < enclosing.end)) continue;
            if (LIST_FIELD.test(ctx(call.index))) hits.push(`js/admin.js:${line(call.index)} ${enclosing.name}() ${op}s on commas (line ${line(m.index)}) and is applied to itinerary/essentials — use one entry per line`);
        }
    }
    hits.forEach((h) => fail(h));
    if (!hits.length) ok('itinerary/essentials are never split or joined on commas');
});

// ---------------------------------------------------------------------------------------------
// 10. Every @font-face (and other) url() in the stylesheets exists
// ---------------------------------------------------------------------------------------------
check('10. CSS url() targets', () => {
    const sources = [];
    for (const rel of ['css/styles.css', 'css/admin.css']) { const t = read(rel); if (t != null) sources.push({ rel, text: t, base: 'css' }); }
    for (const rel of ['index.html', 'admin.html', 'qr.html']) {
        const t = read(rel);
        if (t == null) continue;
        // Keep only the <style> blocks, blanking everything else so offsets/line numbers stay true.
        const masked = maskHtml(t, { keepScripts: true });
        let text = '', last = 0;
        for (const m of masked.matchAll(/<style\b[^>]*>[\s\S]*?<\/style\s*>/gi)) {
            text += blank(masked.slice(last, m.index)) + m[0];
            last = m.index + m[0].length;
        }
        if (last) sources.push({ rel, text: text + blank(masked.slice(last)), base: '.', html: true });
    }
    const fontUrls = new Map();     // repo path (incl. query) → [where]
    let fonts = 0, others = 0;
    const f0 = cur.fails;
    for (const s of sources) {
        const text = s.text.replace(/\/\*[\s\S]*?\*\//g, blank);
        const line = lineIndex(text);
        const sheet = parseCss(s.html ? text.replace(/<\/?style\b[^>]*>/gi, blank) : text);
        const faceRanges = sheet.atRules.filter((a) => a.name === 'font-face').map((a) => [a.start, a.start + a.header.length + a.body.length + 2]);
        for (const m of text.matchAll(/url\(\s*(?:"([^"]*)"|'([^']*)'|([^)\s]*))\s*\)/gi)) {
            const u = m[1] ?? m[2] ?? m[3] ?? '';
            const lp = localUrlPath(u, s.base);
            if (!lp) continue;
            const isFont = faceRanges.some(([a, b]) => m.index >= a && m.index < b);
            isFont ? fonts++ : others++;
            if (lp.abs) { fail(`${s.rel}:${line(m.index)} url(${u}) is root-absolute — breaks under the GitHub Pages subpath`); continue; }
            if (isFont) {
                const q = /\?[^#]*/.exec(u);
                const key = lp.path + (q ? q[0] : '');
                (fontUrls.get(key) || fontUrls.set(key, []).get(key)).push(s.rel);
            }
            const st = fileStatus(lp.path);
            if (st !== 'ok') fail(`${s.rel}:${line(m.index)} ${isFont ? '@font-face ' : ''}url(${u}) ${STATUS_TEXT[st]}`);
        }
    }
    if (!fonts) warn('no @font-face url() found in css/styles.css, css/admin.css or qr.html');
    if (cur.fails === f0) ok(`${plural(fonts, '@font-face url()')} and ${plural(others, 'other url()')} exist (${sources.map((s) => s.rel).join(', ')})`);

    // A preload that doesn't match an @font-face URL byte-for-byte is a second, wasted download.
    for (const rel of ['index.html', 'admin.html']) {
        const t = read(rel);
        if (t == null) continue;
        for (const tag of tagsOf(maskHtml(t))) {
            if (tag.name !== 'link' || (tag.get('rel') || '').toLowerCase() !== 'preload' || (tag.get('as') || '') !== 'font') continue;
            const href = tag.get('href') || '';
            const lp = localUrlPath(href);
            if (!lp || lp.abs) continue;
            const q = /\?[^#]*/.exec(href);
            if (!fontUrls.has(lp.path + (q ? q[0] : ''))) warn(`${rel}: preloads ${href} but no @font-face uses exactly that URL — the font downloads twice`);
            if (tag.get('crossorigin') == null) warn(`${rel}: font preload ${href} lacks the crossorigin attribute — the browser ignores it and downloads again`);
        }
    }

    // Font files nobody declares (§D3: delete them once qr.html moves off inter-800/playfair-700).
    if (fs.existsSync(abs('assets/fonts'))) {
        const used = new Set([...fontUrls.keys()].map((k) => k.replace(/\?.*$/, '')));
        const unused = fs.readdirSync(abs('assets/fonts')).filter((f) => /\.(woff2?|ttf|otf)$/i.test(f) && !used.has(`assets/fonts/${f}`));
        if (unused.length) warn(`assets/fonts: ${plural(unused.length, 'file')} no @font-face uses (${unused.join(', ')}) — delete per §D3 once nothing references them`);
    }
});

// =============================================================================================
console.log('');
if (failures > 0) {
    console.log(red(bold(`✗ ${plural(failures, 'problem')} in ${plural(failedSections.length, 'check')}: ${failedSections.join('; ')}`)) + (warnings ? yellow(` · ${plural(warnings, 'warning')}`) : ''));
    process.exit(1);
} else {
    console.log(green(bold('All checks passed.')) + (warnings ? yellow(` (${plural(warnings, 'warning')})`) : ''));
}
