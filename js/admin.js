/* Staff content editor (admin.html). Not loaded by the guest app.
 *
 * Data flow: the editor starts from `defaultData` (js/data.js). Saving or deleting writes the whole
 * catalog to localStorage['ib_app_data'] and sets ib_admin_preview='1', so the guest app on THIS
 * device renders the edits (with a preview pill). Nothing is published until someone downloads or
 * copies the exported code into js/data.js and commits it.
 *
 * saveItem() merges the form into the existing item ({ ...appData[key], ...fields }), so optional
 * fields the form doesn't know about (pdfs, future fields) survive a save. Empty optional fields
 * are deleted rather than stored as ''.
 *
 * Several admin tabs can be open on one device. Save/delete re-read ib_app_data first and change only
 * their own item (per-item read-modify-write), and a 'storage' listener reloads the catalog when
 * another tab writes it, so tabs never silently overwrite each other's edits.
 */
'use strict';

// Client-side password gate. This is a deterrent against casual guest access, not real
// security — anyone who reads this file can see the check and could bypass it via devtools.
// There is no backend, so there is no way to truly authenticate here. To change the password,
// run `crypto.subtle.digest('SHA-256', new TextEncoder().encode('yourNewPassword'))` in a
// browser console, hex-encode the result, and paste it below.
const ADMIN_PASSWORD_HASH = '444d2619acb508ff6c330ea2afeea17139a18cef239bba7b1bd10e415a363753';

// Must equal DATA_VERSION in js/app.js, VERSION in sw.js and every ?v= (scripts/verify.js checks).
const DATA_VERSION = 400;

const LS_DATA = 'ib_app_data';
const LS_VERSION = 'ib_data_version';
const LS_PREVIEW = 'ib_admin_preview';
const LS_IN_HOUSE = 'ib_in_house';
const SS_UNLOCKED = 'ib_admin_unlocked';

/* ------------------------------------------------------------------ storage (never throws) */
const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, String(v)); return true; } catch (e) { return false; } },
    remove(k) { try { localStorage.removeItem(k); } catch (e) { /* ignore */ } }
};
const session = {
    get(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { sessionStorage.setItem(k, v); } catch (e) { /* ignore */ } }
};

/* ------------------------------------------------------------------ small helpers */
const $ = (id) => document.getElementById(id);
const clone = (o) => JSON.parse(JSON.stringify(o));
const isPlainObject = (o) => o !== null && typeof o === 'object' && !Array.isArray(o);
const isEmptyValue = (v) => v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0);
function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
// Originals contain spaces and apostrophes; encode each segment for use as a URL.
function encodePath(p) { return String(p).split('/').map(encodeURIComponent).join('/'); }
function fmtMB(bytes) {
    const n = Number(bytes) || 0;
    if (n < 1e6) return `${Math.max(0, Math.round(n / 1e3))} KB`;
    return `${(n / 1e6).toFixed(1)} MB`;
}
function linesOf(text) {
    return String(text || '').split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
}
// Gallery and tags: one per line, but accept commas when there is no newline (older habit).
function listOrCommas(text) {
    const t = String(text || '');
    if (/\r?\n/.test(t.trim())) return linesOf(t);
    return t.split(',').map((s) => s.trim()).filter(Boolean);
}
function sameSet(a, b) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
    const s = new Set(a);
    return b.every((x) => s.has(x));
}
function deepEqual(a, b) { return JSON.stringify(a) === JSON.stringify(b); }

const TYPE_GROUPS = [
    ['club', 'Resorts'], ['food', 'Dining'], ['fun', 'Activities'],
    ['spa', 'Spa & wellness'], ['golf', 'Golf & nature'], ['store', 'Shop']
];
const TYPE_LABEL = Object.fromEntries(TYPE_GROUPS);
// The section comments CLAUDE.md promises in js/data.js; the export re-creates them.
const SECTION_COMMENT = { club: 'CLUBS', golf: 'GOLF', store: 'STORE', fun: 'FUN', spa: 'SPA', food: 'FOOD' };

/* ------------------------------------------------------------------ password gate */
async function sha256Hex(text) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function checkPassword() {
    const input = $('gatePassword');
    const error = $('gateError');
    if (!window.crypto || !crypto.subtle) {
        error.textContent = 'Open this page over https (or localhost) to unlock it.';
        error.hidden = false;
        return;
    }
    const hash = await sha256Hex(input.value);
    if (hash === ADMIN_PASSWORD_HASH) {
        session.set(SS_UNLOCKED, 'true');
        error.hidden = true;
        showAdmin();
    } else {
        error.textContent = 'Incorrect password. Try again.';
        error.hidden = false;
        input.setAttribute('aria-invalid', 'true');
        input.value = '';
        input.focus();
    }
}

let adminStarted = false;
function showAdmin() {
    $('gateScreen').hidden = true;
    $('adminContent').classList.add('active');
    if (adminStarted) return;
    adminStarted = true;
    loadAppData();
    renderBanners();
    renderAdminList();
    initDeviceTools();
    probeAll();
    const fromHash = decodeURIComponent((location.hash || '').slice(1));
    if (fromHash && appData[fromHash]) loadItemIntoForm(fromHash);
    else clearForm(true);
}

/* ------------------------------------------------------------------ data */
let appData = {};
let published = {};
let previewInfo = { active: false, version: null, unreadable: false };
let legacyRaw = null;
// True after a localStorage write failed: from then on the in-memory catalog holds edits storage
// never received, so it (not storage) is the source of truth until a later write succeeds.
let storageFailed = false;

// Fingerprints (cyrb53 of JSON.stringify(defaultData)) of every catalog a pre-v4 guest app or editor
// shipped (git history up to f531916). Those versions wrote an unedited copy of the catalog to
// ib_app_data on first visit, so a stored value matching one of these is a stale cache, not edits.
// Generated once from git history; it never needs updating (v4+ never writes ib_app_data unflagged).
const PRE_V4_CATALOGS = new Set([
    '1dq3j3mq0bi', '190qr8sexul', '10u4f066y2q', '7b64x2rm8o', '231janngrso', '7hz5ydzxck', '2985hrff832', '18kq1nerlp9',
    '3w7p232fne', 'bv8remja6x', '15iylvc5jz', '2kiqnp6han', '2bocp2ofpzm', '25vt7qusvd6', '1pnc9wxemd6', '1gnzaa448nm',
    'fat3boq590', '1j6hwbklujz', '2536rkzs6c4', '1fp6lxe9r4g', '4hyjiz2jz9', '2firqkau4mx', '13uqfczt3z0', '24i2j2ek8fb'
]);
// cyrb53: small, fast, synchronous 53-bit string hash (not for security — only to recognise known copies).
function cyrb53(str) {
    let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
    for (let i = 0, ch; i < str.length; i++) {
        ch = str.charCodeAt(i);
        h1 = Math.imul(h1 ^ ch, 2654435761);
        h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}

// (Re)reads the catalog from localStorage. Also the "read" half of every save/delete, so a tab always
// writes on top of what other tabs stored rather than on top of its own stale copy.
function loadAppData() {
    published = typeof defaultData !== 'undefined' && isPlainObject(defaultData) ? clone(defaultData) : {};
    appData = clone(published);
    previewInfo = { active: false, version: null, unreadable: false, paused: false };
    legacyRaw = null;

    const raw = store.get(LS_DATA);
    // '1' = preview on; '0' = the guest app's "Hide preview" paused it. Either way these are staff
    // edits that must stay loadable here; the next save writes '1' again, which resumes the preview.
    const flag = store.get(LS_PREVIEW);
    if (flag === '1' || flag === '0') {
        const paused = flag === '0';
        let parsed = null;
        try { parsed = JSON.parse(raw); } catch (e) { parsed = null; }
        if (isPlainObject(parsed) && Object.values(parsed).every(isPlainObject)) {
            appData = parsed;
            previewInfo = { active: true, version: parseInt(store.get(LS_VERSION), 10) || null, unreadable: false, paused };
        } else {
            previewInfo = { active: true, version: null, unreadable: true, paused };
        }
    } else if (raw) {
        if (PRE_V4_CATALOGS.has(cyrb53(raw))) {
            // An unedited copy of an old published catalog that the pre-v4 site cached on every first
            // visit. It holds no staff edits, so drop it instead of warning about "older edits".
            store.remove(LS_DATA);
            store.remove(LS_VERSION);
        } else {
            // Edits saved by the pre-v4 editor. The guest app ignores them; keep them until staff decide.
            legacyRaw = raw;
        }
    }
}

// Pulls in whatever other tabs saved, unless this tab holds edits storage never received.
function syncFromStorage() {
    if (!storageFailed) loadAppData();
}

// Writes the whole in-memory catalog. Callers sync first, so this only adds their own change.
// Returns false (and changes nothing about the preview state) when storage refuses the write.
function persistAppData() {
    const ok = store.set(LS_DATA, JSON.stringify(appData)) && store.set(LS_VERSION, DATA_VERSION) && store.set(LS_PREVIEW, '1');
    storageFailed = !ok;
    if (ok) {
        previewInfo = { active: true, version: DATA_VERSION, unreadable: false, paused: false };
        legacyRaw = null;
    }
    renderBanners();
    return ok;
}
const STORAGE_FAILED_MSG = 'Not saved — this device’s storage is full or blocked. Use Copy code or Download data.js now to keep this edit.';

function changeSummary() {
    const keys = new Set([...Object.keys(appData), ...Object.keys(published)]);
    let edited = 0, added = 0, removed = 0;
    keys.forEach((k) => {
        if (!(k in published)) added++;
        else if (!(k in appData)) removed++;
        else if (!deepEqual(appData[k], published[k])) edited++;
    });
    return { edited, added, removed };
}
function itemState(key) {
    if (!(key in published)) return 'new';
    return deepEqual(appData[key], published[key]) ? '' : 'edited';
}

function renderBanners() {
    $('storageBanner').hidden = !storageFailed;
    const banner = $('previewBanner');
    banner.hidden = !previewInfo.active;
    if (previewInfo.active) {
        const s = changeSummary();
        const parts = [];
        if (s.edited) parts.push(`${s.edited} edited`);
        if (s.added) parts.push(`${s.added} added`);
        if (s.removed) parts.push(`${s.removed} deleted`);
        let detail = parts.length ? `Not yet published: ${parts.join(' · ')}.` : 'No differences from the published data.';
        if (previewInfo.unreadable) detail = 'The saved local edits could not be read, so the published data is shown. Reset to clear them.';
        else if (previewInfo.version && previewInfo.version < DATA_VERSION) {
            detail += ` These edits were made against an older release (content v${previewInfo.version}); check them before exporting.`;
        }
        if (previewInfo.paused && !previewInfo.unreadable) detail += ' Preview hidden in the guest app — saving any item turns it back on.';
        $('previewBannerDetail').textContent = detail;
    }
    const legacy = $('legacyBanner');
    legacy.hidden = !legacyRaw;
    if (legacyRaw) {
        const v = store.get(LS_VERSION);
        $('legacyBannerTitle').textContent = `Older unpublished edits were found on this device${v ? ` (content v${v})` : ''}.`;
    }
    $('versionChip').textContent = `Content v${DATA_VERSION} · ${Object.keys(appData).length} items`;
}

function resetToPublished() {
    if (!confirm('Discard every local edit on this device and go back to the published data?')) return;
    store.remove(LS_DATA);
    store.remove(LS_VERSION);
    store.remove(LS_PREVIEW);
    formDirty = false;
    storageFailed = false; // the unsaved in-memory edits are discarded on purpose here
    loadAppData();
    renderBanners();
    renderAdminList();
    probeAll();
    if (loadedKey && appData[loadedKey]) loadItemIntoForm(loadedKey); else clearForm(true);
    showToast('Back to the published data');
}

function downloadLegacyBackup() {
    if (!legacyRaw) return;
    downloadFile('ib_app_data-backup.json', legacyRaw, 'application/json');
}
function discardLegacy() {
    if (!confirm('Delete the older local edits from this device? This cannot be undone.')) return;
    store.remove(LS_DATA);
    store.remove(LS_VERSION);
    legacyRaw = null;
    renderBanners();
    showToast('Older local edits removed');
}

/* ------------------------------------------------------------------ hours preview */
// Copied verbatim from js/lib.js (HOURS_RE) — keep the two in sync.
const HOURS_RE = /^(?:(\w[\w &]*?)\s+)?(?:(\d{1,2}:\d{2})-(\d{1,2}:\d{2})|from\s+(\d{1,2}:\d{2}))(?:\s+(Mon|Tue|Wed|Thu|Fri|Sat|Sun)(?:-(Mon|Tue|Wed|Thu|Fri|Sat|Sun))?)?$/;

function fmtClock(hhmm) {
    const [h, m] = hhmm.split(':').map(Number);
    if (h > 24 || m > 59) return null;
    const hh = h % 24;
    const suffix = hh < 12 ? 'AM' : 'PM';
    const h12 = hh % 12 === 0 ? 12 : hh % 12;
    return m ? `${h12}:${String(m).padStart(2, '0')} ${suffix}` : `${h12} ${suffix}`;
}
function describeHoursLine(line) {
    const m = HOURS_RE.exec(line.trim());
    if (!m) return { ok: false, text: 'can’t read this line' };
    const [, label, open, close, from, d1, d2] = m;
    const parts = [];
    if (label) parts.push(label);
    if (from) {
        const f = fmtClock(from);
        if (!f) return { ok: false, text: 'time out of range' };
        parts.push(`from ${f}`);
    } else {
        const o = fmtClock(open), c = fmtClock(close);
        if (!o || !c) return { ok: false, text: 'time out of range' };
        const toMin = (s) => { const [h, mm] = s.split(':').map(Number); return h * 60 + mm; };
        parts.push(`${o}–${c}${toMin(close) <= toMin(open) ? ' (past midnight)' : ''}`);
    }
    if (d1) parts.push(d2 ? `${d1}–${d2}` : d1);
    return { ok: true, text: parts.join(' · ') };
}
function renderHoursPreview() {
    const list = $('hoursPreview');
    const lines = linesOf($('newHours').value);
    list.innerHTML = lines.map((l) => {
        const r = describeHoursLine(l);
        return r.ok
            ? `<li class="is-ok"><span aria-hidden="true">✓</span> ${esc(r.text)}</li>`
            : `<li class="is-bad"><span aria-hidden="true">⚠</span> <code>${esc(l)}</code> — ${esc(r.text)}</li>`;
    }).join('');
}

/* ------------------------------------------------------------------ path probes (broken files) */
const probeCache = new Map();
const probeQueue = [];
let probeActive = 0;
const PROBE_CONCURRENCY = 6;

function probeImage(url) {
    return new Promise((resolve) => {
        const img = new Image();
        img.addEventListener('load', () => resolve(true));
        img.addEventListener('error', () => resolve(false));
        img.src = url;
    });
}
async function probeOnce(path) {
    const url = encodePath(path);
    try {
        const res = await fetch(url, { method: 'HEAD', cache: 'no-cache' });
        if (res.ok) return true;
        if (res.status === 404 || res.status === 410) return false;
    } catch (e) { /* fall through to an Image() probe */ }
    if (/\.(jpe?g|png|webp|gif|avif)$/i.test(path)) return probeImage(url);
    return null; // unknown
}
function pumpProbes() {
    while (probeActive < PROBE_CONCURRENCY && probeQueue.length) {
        const job = probeQueue.shift();
        probeActive++;
        probeOnce(job.path).then(job.resolve, () => job.resolve(null)).finally(() => { probeActive--; pumpProbes(); });
    }
}
// Resolves true (exists), false (missing) or null (couldn't tell, e.g. offline).
function probePath(path) {
    if (!path) return Promise.resolve(null);
    if (!probeCache.has(path)) {
        probeCache.set(path, new Promise((resolve) => { probeQueue.push({ path, resolve }); pumpProbes(); }));
    }
    return probeCache.get(path);
}
function itemPaths(item) {
    const out = [];
    (Array.isArray(item.gallery) ? item.gallery : []).forEach((p) => out.push(['gallery', p]));
    ['logo', 'partnerLogo', 'pdf', 'video'].forEach((f) => { if (typeof item[f] === 'string' && item[f]) out.push([f, item[f]]); });
    if (Array.isArray(item.pdfs)) item.pdfs.forEach((p) => { if (p && typeof p.url === 'string') out.push(['pdfs', p.url]); });
    return out;
}
const brokenByKey = {};
async function probeItem(key) {
    const item = appData[key];
    if (!item) return;
    const paths = itemPaths(item);
    const results = await Promise.all(paths.map(([, p]) => probePath(p)));
    if (appData[key] !== item) return; // changed meanwhile; a newer probe will report
    brokenByKey[key] = paths.filter((_, i) => results[i] === false).map(([f, p]) => `${f}: ${p}`);
    updateRowBroken(key);
}
function probeAll() {
    if (navigator.onLine === false) return;
    Object.keys(appData).forEach(probeItem);
}

/* ------------------------------------------------------------------ list panel */
let listQuery = '';
const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

function thumbSrc(path) {
    if (!path) return '';
    try {
        if (typeof MEDIA !== 'undefined' && MEDIA && MEDIA.img && MEDIA.img[path]) {
            const m = MEDIA.img[path];
            return `assets/img/${m.id}-${m.v[0]}.webp`;
        }
    } catch (e) { /* media.js is optional */ }
    return encodePath(path);
}

function renderAdminList() {
    const container = $('itemListContainer');
    const q = norm(listQuery).trim();
    const keys = Object.keys(appData);
    $('itemCount').textContent = String(keys.length);

    const groups = new Map(TYPE_GROUPS.map(([t]) => [t, []]));
    keys.forEach((key) => {
        const it = appData[key] || {};
        if (q && !norm(`${it.title} ${it.sub} ${key}`).includes(q)) return;
        const t = groups.has(it.type) ? it.type : 'other';
        if (!groups.has(t)) groups.set(t, []);
        groups.get(t).push(key);
    });

    let html = '';
    let shown = 0;
    groups.forEach((list, type) => {
        if (!list.length) return;
        list.sort((a, b) => String(appData[a].title || a).localeCompare(String(appData[b].title || b), undefined, { sensitivity: 'base' }));
        shown += list.length;
        html += `<div class="item-group" role="group" aria-label="${esc(TYPE_LABEL[type] || 'Other')}">
            <h3 class="item-group__head">${esc(TYPE_LABEL[type] || 'Other')} <span class="count">${list.length}</span></h3>
            <ul class="item-group__list">${list.map(rowHTML).join('')}</ul></div>`;
    });
    if (!shown) html = `<p class="empty">No items match “${esc(listQuery)}”.</p>`;
    container.innerHTML = html;

    container.querySelectorAll('img.thumb__img').forEach((img) => {
        img.addEventListener('error', () => { img.closest('.thumb').classList.add('is-empty'); img.remove(); }, { once: true });
    });
    Object.keys(brokenByKey).forEach(updateRowBroken);
}

function rowHTML(key) {
    const it = appData[key] || {};
    const hero = Array.isArray(it.gallery) && it.gallery[0] ? it.gallery[0] : (it.logo || '');
    const state = itemState(key);
    const soon = it.status === 'coming-soon' || /coming soon|in development/i.test(it.sub || '');
    const initial = esc(String(it.title || key).trim().charAt(0).toUpperCase());
    return `<li><button type="button" class="item-row${key === loadedKey ? ' is-current' : ''}" data-key="${esc(key)}"${key === loadedKey ? ' aria-current="true"' : ''}>
        <span class="thumb${hero ? '' : ' is-empty'}" data-initial="${initial}">${hero ? `<img class="thumb__img" src="${esc(thumbSrc(hero))}" alt="" loading="lazy" decoding="async">` : ''}</span>
        <span class="item-row__text">
            <span class="item-row__title">${esc(it.title || '(untitled)')}</span>
            <span class="item-row__meta">${esc(key)}${soon ? ' · Coming soon' : ''}</span>
        </span>
        <span class="item-row__flags">
            ${state ? `<span class="dot dot--edited" title="${state === 'new' ? 'New on this device' : 'Edited on this device'}"></span><span class="visually-hidden">${state === 'new' ? ', new on this device' : ', edited on this device'}</span>` : ''}
            <span class="dot dot--broken" data-broken hidden></span>
        </span>
    </button></li>`;
}

function updateRowBroken(key) {
    const row = document.querySelector(`.item-row[data-key="${CSS.escape(key)}"]`);
    if (!row) return;
    const dot = row.querySelector('[data-broken]');
    const broken = brokenByKey[key] || [];
    dot.hidden = !broken.length;
    if (broken.length) {
        dot.title = `File not found:\n${broken.join('\n')}`;
        dot.setAttribute('role', 'img');
        dot.setAttribute('aria-label', `${broken.length} file${broken.length > 1 ? 's' : ''} not found`);
    }
}

function onListClick(e) {
    const row = e.target.closest('.item-row');
    if (!row) return;
    const key = row.dataset.key;
    if (key === loadedKey && !formDirty) { focusEditor(); return; }
    if (!confirmDiscardIfDirty()) return;
    loadItemIntoForm(key);
    focusEditor();
}
function focusEditor() {
    const card = $('editorCard');
    if (window.matchMedia('(max-width: 899px)').matches) card.scrollIntoView({ behavior: 'smooth', block: 'start' });
    $('newTitle').focus({ preventScroll: true });
}

/* ------------------------------------------------------------------ form <-> item */
// Every key the form owns. Anything else on an item is shown in "Extra fields (JSON)".
const CORE_FIELDS = ['type', 'title', 'sub', 'desc', 'gallery'];
const TEXT_FIELDS = {
    title: 'newTitle', sub: 'newSub', partnerLogo: 'newPartnerLogo', duration: 'newDuration', time: 'newTime',
    logo: 'newLogo', cuisine: 'newCuisine', address: 'newAddress', phone: 'newPhone', whatsapp: 'newWhatsapp',
    bookUrl: 'newBookUrl', bookingNote: 'newBookingNote', pdf: 'newFile', video: 'newVideo'
};
const LINE_FIELDS = { itinerary: 'newItinerary', essentials: 'newEssentials', hours: 'newHours' };
const SELECT_FIELDS = { area: 'newArea', channel: 'newChannel', status: 'newStatus' };
const NUMBER_FIELDS = { priceFrom: 'newPriceFrom', order: 'newOrder' };
const CHECK_FIELDS = { meals: ['breakfast', 'lunch', 'dinner', 'drinks'], featured: ['morning', 'day', 'sunset', 'night'] };
const KNOWN_FIELDS = new Set([
    ...CORE_FIELDS, ...Object.keys(TEXT_FIELDS), ...Object.keys(LINE_FIELDS), ...Object.keys(SELECT_FIELDS),
    ...Object.keys(NUMBER_FIELDS), ...Object.keys(CHECK_FIELDS), 'tags', 'iberocash'
]);
// Ids admin.js reads (kept stable — see CLAUDE.md / spec D1.11).
const FORM_FIELD_IDS = ['newKey', 'newType', 'newDesc', 'newGallery', 'newTags', 'newIberocash', 'newExtra',
    ...Object.values(TEXT_FIELDS), ...Object.values(LINE_FIELDS), ...Object.values(SELECT_FIELDS), ...Object.values(NUMBER_FIELDS)];

let loadedKey = null;
let formDirty = false;
// JSON of the item as it was when loaded into the form (detects edits made in another tab meanwhile).
let loadedItemJSON = null;
// Every form control's value right after load/save/clear. "Dirty" means the form differs from this,
// not merely that an input/change event fired (a blur after Ctrl/⌘+S fires 'change' with nothing new).
let formSnapshot = null;
function formFingerprint() {
    return JSON.stringify([...$('itemForm').elements].map((el) => (el.type === 'checkbox' || el.type === 'radio' ? el.checked : el.value)));
}

function setSelect(id, value) {
    const sel = $(id);
    const v = value == null ? '' : String(value);
    if (v && ![...sel.options].some((o) => o.value === v)) {
        const opt = document.createElement('option');
        opt.value = v; opt.textContent = `${v} (custom)`; opt.dataset.custom = '1';
        sel.appendChild(opt);
    }
    sel.value = v;
}
function asLines(v) {
    if (Array.isArray(v)) return v.map(String).join('\n');
    return v == null ? '' : String(v);
}

function loadItemIntoForm(key) {
    const item = appData[key];
    if (!item) return;
    clearFieldErrors();
    document.querySelectorAll('#itemForm option[data-custom]').forEach((o) => o.remove());

    $('newKey').value = key;
    setSelect('newType', item.type || 'food');
    $('newDesc').value = item.desc == null ? '' : String(item.desc);
    Object.entries(TEXT_FIELDS).forEach(([f, id]) => { $(id).value = item[f] == null ? '' : String(item[f]); });
    Object.entries(LINE_FIELDS).forEach(([f, id]) => { $(id).value = asLines(item[f]); });
    Object.entries(SELECT_FIELDS).forEach(([f, id]) => setSelect(id, item[f]));
    Object.entries(NUMBER_FIELDS).forEach(([f, id]) => { $(id).value = typeof item[f] === 'number' ? String(item[f]) : (item[f] || ''); });
    $('newGallery').value = asLines(item.gallery);
    $('newTags').value = asLines(item.tags);
    $('newIberocash').value = item.iberocash === true ? 'true' : item.iberocash === false ? 'false' : '';
    Object.entries(CHECK_FIELDS).forEach(([f]) => {
        const vals = Array.isArray(item[f]) ? item[f] : (item[f] ? [item[f]] : []);
        document.querySelectorAll(`#itemForm input[name="${f}"]`).forEach((cb) => { cb.checked = vals.includes(cb.value); });
    });
    const extra = {};
    Object.keys(item).forEach((k) => { if (!KNOWN_FIELDS.has(k)) extra[k] = item[k]; });
    $('newExtra').value = Object.keys(extra).length ? JSON.stringify(extra, null, 2) : '';

    loadedKey = key;
    loadedItemJSON = JSON.stringify(item);
    formDirty = false;
    formSnapshot = formFingerprint();
    try { history.replaceState(null, '', `#${encodeURIComponent(key)}`); } catch (e) { /* ignore */ }
    updateEditorHead();
    renderGalleryStrip();
    renderHoursPreview();
    markCurrentRow();
    setFormState('');
}

function clearForm(force) {
    if (force !== true && !confirmDiscardIfDirty()) return;
    clearFieldErrors();
    document.querySelectorAll('#itemForm option[data-custom]').forEach((o) => o.remove());
    $('itemForm').reset();
    $('newType').value = 'food';
    loadedKey = null;
    loadedItemJSON = null;
    formDirty = false;
    formSnapshot = formFingerprint();
    try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { /* ignore */ }
    updateEditorHead();
    renderGalleryStrip();
    renderHoursPreview();
    markCurrentRow();
    setFormState('');
}

function updateEditorHead() {
    const item = loadedKey && appData[loadedKey];
    $('editorEyebrow').textContent = item ? `${TYPE_LABEL[item.type] || 'Item'} · ${loadedKey}` : 'New item';
    $('editorHeading').textContent = item ? (item.title || loadedKey) : 'Add an item';
    const link = $('viewInAppLink');
    link.hidden = !item;
    if (item) link.href = `index.html#/item/${encodeURIComponent(loadedKey)}`;
    $('deleteBtn').disabled = !item;
}
function markCurrentRow() {
    document.querySelectorAll('.item-row').forEach((r) => {
        const cur = r.dataset.key === loadedKey;
        r.classList.toggle('is-current', cur);
        if (cur) r.setAttribute('aria-current', 'true'); else r.removeAttribute('aria-current');
    });
}

/* inline field errors */
function setFieldError(id, msg) {
    const el = $(id);
    if (!el) return;
    el.setAttribute('aria-invalid', 'true');
    let p = $(`${id}-err`);
    if (!p) {
        p = document.createElement('p');
        p.id = `${id}-err`;
        p.className = 'field-msg is-error';
        el.closest('.form-group').appendChild(p);
        el.setAttribute('aria-describedby', `${el.getAttribute('aria-describedby') || ''} ${p.id}`.trim());
    }
    p.textContent = msg;
}
function clearFieldErrors() {
    document.querySelectorAll('#itemForm [aria-invalid]').forEach((el) => {
        el.removeAttribute('aria-invalid');
        const p = $(`${el.id}-err`);
        if (p) {
            p.remove();
            const rest = (el.getAttribute('aria-describedby') || '').split(/\s+/).filter((x) => x && x !== `${el.id}-err`);
            if (rest.length) el.setAttribute('aria-describedby', rest.join(' ')); else el.removeAttribute('aria-describedby');
        }
    });
}
function setFormState(msg, kind) {
    const s = $('formState');
    s.textContent = msg;
    s.dataset.kind = kind || '';
}

// Reads the form into { key, fields, extra, errors, warnings }. fields holds every form-owned key,
// with '' / [] meaning "empty" (saveItem deletes those rather than storing them).
function readForm() {
    const errors = [];
    const warnings = [];
    const key = $('newKey').value.trim();
    const fields = {};

    fields.type = $('newType').value;
    fields.desc = $('newDesc').value;
    Object.entries(TEXT_FIELDS).forEach(([f, id]) => { fields[f] = $(id).value.trim(); });
    Object.entries(LINE_FIELDS).forEach(([f, id]) => { fields[f] = linesOf($(id).value); });
    Object.entries(SELECT_FIELDS).forEach(([f, id]) => { fields[f] = $(id).value; });
    fields.gallery = listOrCommas($('newGallery').value);
    fields.tags = listOrCommas($('newTags').value);
    const ib = $('newIberocash').value;
    fields.iberocash = ib === 'true' ? true : ib === 'false' ? false : '';
    Object.entries(CHECK_FIELDS).forEach(([f, order]) => {
        const checked = [...document.querySelectorAll(`#itemForm input[name="${f}"]:checked`)].map((c) => c.value);
        fields[f] = order.filter((v) => checked.includes(v));
    });
    Object.entries(NUMBER_FIELDS).forEach(([f, id]) => {
        const raw = $(id).value.trim();
        if (!raw) { fields[f] = ''; return; }
        const n = Number(raw);
        if (!Number.isFinite(n)) errors.push([id, 'Enter a number.']);
        fields[f] = n;
    });

    // A .mp4 typed into the PDF box (the old single "PDF/Video" field) is routed to video.
    if (/\.mp4$/i.test(fields.pdf) && !fields.video) { fields.video = fields.pdf; fields.pdf = ''; }

    if (!key) errors.push(['newKey', 'An ID is required.']);
    else if (!/^[A-Za-z0-9_-]+$/.test(key)) errors.push(['newKey', 'Use only letters, numbers, - and _ (no spaces).']);
    if (!fields.title) errors.push(['newTitle', 'A title is required.']);
    if (!TYPE_LABEL[fields.type]) errors.push(['newType', 'Choose a type.']);

    if (fields.whatsapp) {
        const digits = fields.whatsapp.replace(/\D/g, '');
        if (digits.length < 7 || digits.length > 15) errors.push(['newWhatsapp', 'Enter the full number with country code (7–15 digits).']);
        fields.whatsapp = digits;
    }
    if (fields.phone) {
        const p = fields.phone.replace(/[\s().-]/g, '');
        if (!/^\+[1-9]\d{6,14}$/.test(p)) errors.push(['newPhone', 'Use international format: + then country code and number.']);
        else fields.phone = p;
    }
    if (fields.bookUrl) {
        let ok = false;
        try { ok = /^https?:$/.test(new URL(fields.bookUrl).protocol); } catch (e) { ok = false; }
        if (!ok) errors.push(['newBookUrl', 'Enter a full link starting with https://']);
    }

    let extra = {};
    const extraRaw = $('newExtra').value.trim();
    if (extraRaw) {
        try {
            extra = JSON.parse(extraRaw);
            if (!isPlainObject(extra)) { errors.push(['newExtra', 'Must be a JSON object, e.g. { "pdfs": [ … ] }.']); extra = {}; }
            else {
                const clash = Object.keys(extra).filter((k) => KNOWN_FIELDS.has(k));
                if (clash.length) errors.push(['newExtra', `Use the fields above for: ${clash.join(', ')}.`]);
            }
        } catch (e) {
            errors.push(['newExtra', `Not valid JSON: ${e.message}`]);
            extra = {};
        }
    }

    const badHours = fields.hours.filter((l) => !describeHoursLine(l).ok);
    if (badHours.length) warnings.push(`${badHours.length} opening-hours line${badHours.length > 1 ? 's' : ''} can’t be read. Guests will see ${badHours.length > 1 ? 'them' : 'it'} as plain text with no open/closed status, and verify.js will flag ${badHours.length > 1 ? 'them' : 'it'}.`);

    return { key, fields, extra, errors, warnings };
}

async function knownBrokenGallery(paths) {
    const res = await Promise.all(paths.map((p) => Promise.race([probePath(p), new Promise((r) => setTimeout(() => r(null), 1500))])));
    return paths.filter((_, i) => res[i] === false);
}

let saving = false;
async function saveItem() {
    if (saving) return;
    clearFieldErrors();
    const { key, fields, extra, errors, warnings } = readForm();
    if (errors.length) {
        errors.forEach(([id, msg]) => setFieldError(id, msg));
        setFormState(`Fix ${errors.length} field${errors.length > 1 ? 's' : ''} to save.`, 'error');
        const first = $(errors[0][0]);
        if (first) { first.scrollIntoView({ block: 'center', behavior: 'smooth' }); first.focus({ preventScroll: true }); }
        return;
    }

    // Another admin tab may have saved since this one loaded: check against what is stored now.
    syncFromStorage();
    renderBanners();
    if (loadedKey && loadedItemJSON !== null) {
        const current = appData[loadedKey];
        if ((current ? JSON.stringify(current) : null) !== loadedItemJSON && !confirm(current
            ? `“${current.title || loadedKey}” was changed in another tab after you opened it here.\n\nSave this form’s version over it?`
            : `“${loadedKey}” was deleted in another tab after you opened it here.\n\nSave it again from this form?`)) {
            renderAdminList();
            return;
        }
    }

    const renaming = loadedKey && key !== loadedKey && appData[loadedKey];
    if (renaming && appData[key]) {
        setFieldError('newKey', `That ID is already used by “${appData[key].title || key}”.`);
        $('newKey').focus();
        return;
    }
    if (!loadedKey && appData[key] && !confirm(`An item with the ID “${key}” already exists (${appData[key].title || key}). Update it with this form?`)) return;
    if (renaming && !confirm(`Rename ${loadedKey} → ${key}?\n\nLinks that guests saved to the old ID will stop opening this item.`)) return;

    saving = true;
    try {
        const missing = fields.gallery.length ? await knownBrokenGallery(fields.gallery) : [];
        if (missing.length) warnings.push(`${missing.length} gallery photo${missing.length > 1 ? 's' : ''} can’t be found:\n${missing.join('\n')}`);
        if (warnings.length && !confirm(`${warnings.join('\n\n')}\n\nSave anyway?`)) return;

        // Read-modify-write: re-read storage (the awaits/dialogs above let other tabs save) and apply
        // only this item's change on top. Everything from here to persistAppData() is synchronous.
        syncFromStorage();

        // The form owns its keys; everything else is "extra". Only an item that was loaded into the
        // form has its extras shown, so only then may removing a key from the JSON delete it.
        const sameItemLoaded = !!loadedKey && (loadedKey === key || renaming);
        if (renaming && appData[loadedKey]) renameKeyInPlace(loadedKey, key);
        const before = appData[key] ? clone(appData[key]) : null;
        const isNew = !before;

        appData[key] = { ...(appData[key] || {}), ...fields, ...extra };

        const item = appData[key];
        Object.keys(fields).forEach((f) => {
            if (CORE_FIELDS.includes(f)) return;
            const prev = before ? before[f] : undefined;
            if (isEmptyValue(item[f])) {
                // Leave a pre-existing empty value exactly as it was (round-trips unchanged items);
                // otherwise an emptied optional field is removed, never stored as ''.
                if (before && f in before && isEmptyValue(prev)) item[f] = prev;
                else delete item[f];
            } else if (CHECK_FIELDS[f] && sameSet(prev, item[f])) {
                item[f] = prev; // same choices: keep the stored order
            }
        });
        if (sameItemLoaded && before) {
            Object.keys(before).forEach((k) => { if (!KNOWN_FIELDS.has(k) && !(k in extra)) delete item[k]; });
        }
        // New items, and items whose type changed, go to the end of their type's block so the
        // export keeps one // SECTION per type.
        if (isNew || before.type !== item.type) placeNewItem(key);

        loadedKey = key;
        const ok = persistAppData();
        renderAdminList();
        loadItemIntoForm(key);
        probeAll();
        if (!ok) {
            // The edit is kept in memory (so Copy code / Download still include it) but is NOT on the
            // device: stay dirty so leaving warns, and say so instead of "Saved".
            formDirty = true;
            formSnapshot = null;
            setFormState(STORAGE_FAILED_MSG, 'error');
            showToast('Could not save on this device (storage is full or blocked)', true);
            return;
        }
        showToast(renaming ? `Renamed and saved · ${key}` : 'Saved on this device');
        setFormState('Saved on this device. Export from Publish when you’re done.', 'ok');
    } finally {
        saving = false;
    }
}

// Rebuild appData with newKey in oldKey's position, so the catalog order (= display order) holds.
function renameKeyInPlace(oldKey, newKey) {
    const next = {};
    Object.keys(appData).forEach((k) => { next[k === oldKey ? newKey : k] = appData[k]; });
    appData = next;
}
// New items go after the last item of the same type, so the export keeps the // SECTION grouping.
function placeNewItem(key) {
    const type = appData[key].type;
    const keys = Object.keys(appData).filter((k) => k !== key);
    let at = -1;
    keys.forEach((k, i) => { if (appData[k].type === type) at = i; });
    const next = {};
    keys.forEach((k, i) => { next[k] = appData[k]; if (i === at) next[key] = appData[key]; });
    if (at === -1) next[key] = appData[key]; // first of its type: goes to the end
    appData = next;
}

function deleteItem() {
    const key = loadedKey || $('newKey').value.trim();
    if (!key || !appData[key]) { showToast('Select an item first', true); return; }
    if (!confirm(`Delete “${appData[key].title || key}” (${key})?\n\nIt disappears on this device now and for everyone once you publish the export.`)) return;
    syncFromStorage(); // read-modify-write: keep what other tabs saved meanwhile
    const existed = key in appData;
    delete appData[key];
    delete brokenByKey[key];
    const ok = existed ? persistAppData() : true;
    formDirty = false;
    clearForm(true);
    renderBanners();
    renderAdminList();
    if (!ok) {
        setFormState(STORAGE_FAILED_MSG.replace('this edit', 'this deletion'), 'error');
        showToast('Could not delete on this device (storage is full or blocked)', true);
        return;
    }
    showToast(existed ? 'Item deleted on this device' : 'Already deleted in another tab');
}

/* ------------------------------------------------------------------ gallery strip */
let stripTimer = null;
function renderGalleryStrip() {
    const strip = $('galleryStrip');
    const paths = listOrCommas($('newGallery').value);
    $('galleryMsg').textContent = paths.length ? `${paths.length} photo${paths.length > 1 ? 's' : ''}` : 'No photos — the app shows a branded placeholder.';
    strip.innerHTML = paths.map((p, i) => `<figure class="g-thumb" data-path="${esc(p)}">
        <img src="${esc(thumbSrc(p))}" alt="" loading="lazy" decoding="async">
        <figcaption>${i === 0 ? 'Hero' : i + 1}</figcaption></figure>`).join('');
    let broken = 0;
    strip.querySelectorAll('img').forEach((img) => {
        img.addEventListener('error', () => {
            const fig = img.closest('.g-thumb');
            fig.classList.add('is-broken');
            fig.title = `Not found: ${fig.dataset.path}`;
            fig.querySelector('figcaption').textContent = 'Not found';
            broken++;
            $('galleryMsg').textContent = `${paths.length} photo${paths.length > 1 ? 's' : ''} · ${broken} not found (outlined in red)`;
        }, { once: true });
    });
}

/* ------------------------------------------------------------------ export */
let fileHeader = null;
const FALLBACK_HEADER = [
    '// Content catalog. gallery[0] is the card/hero image and gallery holds photos only — brand logos and',
    '// wordmarks go in the optional "logo" field, never in gallery. Every path is a real file on disk',
    '// (checked by `node scripts/verify.js` — do not add paths here without confirming the file exists).',
    '// Optional guest-app fields (area, cuisine, meals, tags, featured, channel, status, iberocash, …) are',
    '// documented in CLAUDE.md. Never add hours, phone/WhatsApp numbers, booking links, prices or redemption',
    '// copy that staff have not verified.',
    ''
].join('\n');

async function getFileHeader() {
    if (fileHeader !== null) return fileHeader;
    try {
        const res = await fetch(`js/data.js?v=${DATA_VERSION}`, { cache: 'no-cache' });
        const text = await res.text();
        const at = text.indexOf('const defaultData');
        fileHeader = res.ok && at >= 0 ? text.slice(0, at) : FALLBACK_HEADER;
    } catch (e) {
        fileHeader = FALLBACK_HEADER;
    }
    return fileHeader;
}

const isFlatObject = (o) => isPlainObject(o) && Object.values(o).every((v) => v === null || typeof v !== 'object');
// Formats like js/data.js: 4-space JSON, flat objects inside arrays on one line ({ "label": …, "url": … }).
function fmtValue(v, depth) {
    const pad = '    '.repeat(depth);
    const padIn = '    '.repeat(depth + 1);
    if (Array.isArray(v)) {
        if (!v.length) return '[]';
        const inline = v.every(isFlatObject);
        const items = v.map((el) => inline
            ? `{ ${Object.entries(el).map(([k, x]) => `${JSON.stringify(k)}: ${JSON.stringify(x)}`).join(', ')} }`
            : fmtValue(el, depth + 1));
        return `[\n${items.map((s) => padIn + s).join(',\n')}\n${pad}]`;
    }
    if (isPlainObject(v)) {
        const entries = Object.entries(v).filter(([, x]) => x !== undefined);
        if (!entries.length) return '{}';
        return `{\n${entries.map(([k, x]) => `${padIn}${JSON.stringify(k)}: ${fmtValue(x, depth + 1)}`).join(',\n')}\n${pad}}`;
    }
    return JSON.stringify(v === undefined ? null : v);
}
function buildExportCode() {
    const lines = [];
    let prevType = null;
    // One block per type (in order of first appearance, catalog order kept within a type), so the
    // file always has a single // SECTION comment per type even if older local edits left one split.
    const byType = new Map();
    Object.keys(appData).forEach((k) => {
        const t = appData[k].type;
        if (!byType.has(t)) byType.set(t, []);
        byType.get(t).push(k);
    });
    const keys = [...byType.values()].flat();
    keys.forEach((key, i) => {
        const item = appData[key];
        if (item.type !== prevType && SECTION_COMMENT[item.type]) {
            if (i > 0) lines.push('');
            lines.push(`    // ${SECTION_COMMENT[item.type]}`);
        }
        prevType = item.type;
        lines.push(`    ${JSON.stringify(key)}: ${fmtValue(item, 1)}${i < keys.length - 1 ? ',' : ''}`);
    });
    return `const defaultData = {\n${lines.join('\n')}\n};\n`;
}

async function exportData() {
    const code = buildExportCode();
    try {
        if (!navigator.clipboard || !window.isSecureContext) throw new Error('clipboard unavailable');
        await navigator.clipboard.writeText(code);
        $('exportFallback').hidden = true;
        showToast('Code copied. Paste it over the whole of js/data.js below the header comment.');
    } catch (e) {
        const box = $('exportFallback');
        const out = $('exportOutput');
        box.hidden = false;
        out.value = code;
        out.focus();
        out.select();
        showToast('Copy blocked — select the code below and copy it manually', true);
    }
}

function downloadFile(name, text, type) {
    const blob = new Blob([text], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
}
async function downloadDataJs() {
    const header = await getFileHeader();
    downloadFile('data.js', header + buildExportCode(), 'text/javascript;charset=utf-8');
    showToast('data.js downloaded. Replace js/data.js with it, bump the version, then commit.');
}

/* ------------------------------------------------------------------ device tools */
let cacheWatchdog = null;
let lastProgress = null;
let cacheRunning = false;

function setCacheStatus(msg, kind) {
    const s = $('cacheStatus');
    s.textContent = msg;
    s.dataset.kind = kind || '';
}
function armCacheWatchdog() {
    clearTimeout(cacheWatchdog);
    cacheWatchdog = setTimeout(() => {
        if (!cacheRunning) return;
        cacheRunning = false;
        $('preloadBtn').disabled = false;
        setCacheStatus(lastProgress
            ? `Stopped responding at ${lastProgress.done}/${lastProgress.total}. Check the Wi-Fi and press Cache everything again (finished files are kept).`
            : 'The offline worker did not respond. Open the guest app, wait a few seconds, then try again.', 'error');
    }, lastProgress ? 45000 : 15000);
}

async function prepareOffline() {
    if (!('serviceWorker' in navigator)) { setCacheStatus('This browser does not support offline caching.', 'error'); return; }
    if (!navigator.serviceWorker.controller) {
        setCacheStatus('Open the guest app once on this device first, then come back and press Cache everything.', 'error');
        return;
    }
    if (navigator.onLine === false) { setCacheStatus('This device is offline. Connect to Wi-Fi first.', 'error'); return; }
    cacheRunning = true;
    lastProgress = null;
    $('preloadBtn').disabled = true;
    const bar = $('cacheProgress');
    bar.hidden = false;
    bar.removeAttribute('value'); // indeterminate until the first progress message
    setCacheStatus('Starting download…');
    try {
        await navigator.serviceWorker.ready;
        const ctl = navigator.serviceWorker.controller;
        if (!ctl) throw new Error('no controller');
        ctl.postMessage({ type: 'precache-all' });
        armCacheWatchdog();
    } catch (e) {
        cacheRunning = false;
        $('preloadBtn').disabled = false;
        bar.hidden = true;
        setCacheStatus('Open the guest app once on this device first.', 'error');
    }
}

function onSwMessage(e) {
    const d = e.data || {};
    const bar = $('cacheProgress');
    if (d.type === 'progress') {
        lastProgress = d;
        if (!cacheRunning) { cacheRunning = true; $('preloadBtn').disabled = true; }
        bar.hidden = false;
        bar.max = Math.max(1, Number(d.total) || 1);
        bar.value = Math.min(bar.max, Number(d.done) || 0);
        setCacheStatus(`Cached ${d.done}/${d.total} · ${fmtMB(d.bytes)}`);
        armCacheWatchdog();
    } else if (d.type === 'done') {
        clearTimeout(cacheWatchdog);
        cacheRunning = false;
        $('preloadBtn').disabled = false;
        bar.max = 1; bar.value = 1;
        const p = d.total != null ? d : (lastProgress || d);
        const total = p.total != null ? `${p.done != null ? p.done : p.total}/${p.total} files` : 'all files';
        const failed = Number(d.failed != null ? d.failed : p.failed) || 0;
        if (failed > 0) setCacheStatus(`Cached ${total} · ${fmtMB(d.bytes != null ? d.bytes : p.bytes)} · ${failed} failed — press Cache everything again on Wi-Fi`, 'error');
        else setCacheStatus(`Offline ready · ${total} · ${fmtMB(d.bytes != null ? d.bytes : p.bytes)}`, 'ok');
        updateStorageEstimate();
    }
}

async function clearOfflineCache() {
    const btn = $('clearCacheBtn');
    btn.disabled = true;
    try {
        const ctl = 'serviceWorker' in navigator && navigator.serviceWorker.controller;
        if (ctl) ctl.postMessage({ type: 'clear' });
        // Also clear directly (works without a controller) — the page shares Cache Storage with the SW.
        if ('caches' in window) await Promise.all(['ib-media-v1', 'ib-runtime-v1', 'ib-aruba-v1'].map((n) => caches.delete(n)));
        $('cacheProgress').hidden = true;
        setCacheStatus('Offline photos and menus cleared from this device. The app itself still opens offline.', 'ok');
        showToast('Offline cache cleared');
    } catch (e) {
        setCacheStatus('Could not clear the offline cache.', 'error');
    } finally {
        btn.disabled = false;
        setTimeout(updateStorageEstimate, 400);
    }
}

async function updateStorageEstimate() {
    const el = $('cacheStorage');
    try {
        if (!navigator.storage || !navigator.storage.estimate) { el.textContent = ''; return; }
        const { usage } = await navigator.storage.estimate();
        el.textContent = `Storage used on this device: ${fmtMB(usage)}`;
    } catch (e) { el.textContent = ''; }
}

function initDeviceTools() {
    const sw = 'serviceWorker' in navigator;
    if (sw) navigator.serviceWorker.addEventListener('message', onSwMessage);
    if (!sw) setCacheStatus('This browser does not support offline caching.', 'error');
    else if (!navigator.serviceWorker.controller) setCacheStatus('Open the guest app once on this device first.', 'info');
    // The pre-v4 editor cached into 'ib-aruba-v1'; nothing reads it any more.
    if ('caches' in window) caches.delete('ib-aruba-v1').catch(() => {});
    updateStorageEstimate();

    const sw2 = $('lobbySwitch');
    sw2.checked = store.get(LS_IN_HOUSE) === 'true';
    sw2.addEventListener('change', () => {
        store.set(LS_IN_HOUSE, sw2.checked ? 'true' : 'false');
        showToast(sw2.checked ? 'Lobby mode on: in-house partners only' : 'Lobby mode off: all tour partners');
    });
}

/* ------------------------------------------------------------------ toast + dirty guard */
let toastTimer = null;
function showToast(msg, isError) {
    const toast = $('modeToast');
    toast.textContent = msg;
    toast.classList.toggle('is-error', !!isError);
    toast.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('is-visible'), 3200);
}

function markFormDirty() {
    if (formSnapshot !== null && formFingerprint() === formSnapshot) {
        // Back to what was loaded/saved (e.g. the 'change' fired by a blur after Ctrl/⌘+S).
        if (formDirty) {
            formDirty = false;
            if ($('formState').dataset.kind === 'dirty') setFormState('');
        }
        return;
    }
    formDirty = true;
    if (storageFailed) setFormState(STORAGE_FAILED_MSG, 'error');
    else setFormState('Unsaved changes', 'dirty');
}
function confirmDiscardIfDirty() {
    if (!formDirty) return true;
    return confirm('You have unsaved changes on this item. Discard them?');
}
window.addEventListener('beforeunload', (e) => {
    if (formDirty || storageFailed) { e.preventDefault(); e.returnValue = ''; }
});

/* ------------------------------------------------------------------ other admin tabs */
// 'storage' fires in every OTHER tab of this origin when one writes localStorage.
let externalSyncTimer = null;
window.addEventListener('storage', (e) => {
    if (!adminStarted || storageFailed) return;
    if (e.key !== null && e.key !== LS_DATA && e.key !== LS_PREVIEW && e.key !== LS_VERSION) return;
    try { if (e.storageArea && e.storageArea !== localStorage) return; } catch (err) { return; }
    clearTimeout(externalSyncTimer);
    externalSyncTimer = setTimeout(onExternalCatalogChange, 60); // one save writes three keys
});
function onExternalCatalogChange() {
    if (saving) { externalSyncTimer = setTimeout(onExternalCatalogChange, 200); return; } // saveItem syncs itself
    loadAppData();
    renderBanners();
    renderAdminList();
    probeAll();
    if (!loadedKey) return;
    const current = appData[loadedKey];
    if ((current ? JSON.stringify(current) : null) === loadedItemJSON) return; // this item untouched
    if (!formDirty) {
        if (current) { loadItemIntoForm(loadedKey); showToast('This item was updated in another tab'); }
        else { clearForm(true); showToast('This item was deleted in another tab'); }
    } else {
        setFormState(current
            ? 'This item was also changed in another tab. Saving replaces that version.'
            : 'This item was deleted in another tab. Saving adds it back.', 'error');
    }
}

/* ------------------------------------------------------------------ wiring (no inline handlers) */
function init() {
    $('gateForm').addEventListener('submit', (e) => { e.preventDefault(); checkPassword(); });
    $('gatePassword').addEventListener('input', () => { $('gatePassword').removeAttribute('aria-invalid'); });

    $('itemForm').addEventListener('submit', (e) => { e.preventDefault(); saveItem(); });
    // Enter in a single-line field shouldn't save by accident; Ctrl/⌘+S does.
    $('itemForm').addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && e.target.tagName === 'INPUT' && e.target.type !== 'checkbox') e.preventDefault();
    });
    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's' && $('adminContent').classList.contains('active')) {
            e.preventDefault();
            saveItem();
        }
    });
    $('itemForm').addEventListener('input', markFormDirty);
    $('itemForm').addEventListener('change', markFormDirty);
    $('newGallery').addEventListener('input', () => { clearTimeout(stripTimer); stripTimer = setTimeout(renderGalleryStrip, 350); });
    $('newHours').addEventListener('input', renderHoursPreview);

    $('deleteBtn').addEventListener('click', deleteItem);
    $('clearBtn').addEventListener('click', () => clearForm());
    $('newItemBtn').addEventListener('click', () => { clearForm(); if (!formDirty) { focusEditor(); $('newKey').focus(); } });

    $('itemListContainer').addEventListener('click', onListClick);
    $('listSearch').addEventListener('input', (e) => { listQuery = e.target.value; renderAdminList(); });

    $('exportBtn').addEventListener('click', exportData);
    $('downloadBtn').addEventListener('click', downloadDataJs);
    $('exportFallbackClose').addEventListener('click', () => { $('exportFallback').hidden = true; $('exportBtn').focus(); });

    $('resetPublishedBtn').addEventListener('click', resetToPublished);
    $('storageExportBtn').addEventListener('click', exportData);
    $('storageDownloadBtn').addEventListener('click', downloadDataJs);
    $('legacyBackupBtn').addEventListener('click', downloadLegacyBackup);
    $('legacyDiscardBtn').addEventListener('click', discardLegacy);

    $('preloadBtn').addEventListener('click', prepareOffline);
    $('clearCacheBtn').addEventListener('click', clearOfflineCache);

    if (session.get(SS_UNLOCKED) === 'true') showAdmin();
    else $('gatePassword').focus();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();
