/* =============================================================================
   js/app.js — Iberostar Aruba guest app (v4): state, router, overlay manager, views.
   Depends on (all classic `defer`, in order): image-utils.js → data.js → media.js (optional)
   → lib.js → app.js. The last line calls boot().

   Sections
     0. Constants              7. Overlay manager (Overlay.open/close/closeTop)
     1. store wrapper          8. Router (parseRoute, go, render, history model)
     2. Data + normalize       9. Card components
     3. State + saved list    10. Views: Today, Dine, Explore, Spa, Saved, Resorts
     4. DOM helpers, toast    11. Filters + inline search (Dine/Explore)
     5. Theme / phase / clock 12. Overlays: detail, search, settings, action, media, lightbox,
     6. Shell (tabs, app bar,     concierge request + tickets
        keyboard, network)   13. Events, kept globals, service worker, boot
   ========================================================================== */
'use strict';

/* ---------- 0. Constants ---------- */
const DATA_VERSION = 400;
const APP_VERSION = '4.0';
/* Today hero photo per phase (§B.1). build-images.py mirrors this list — keep paths literal. */
const TODAY_HERO = {
    morning: 'assets/Hotels/Joia/hotel_joia_9.jpg',
    day: 'assets/Hotels/Joia/hotel_joia_1.jpg',
    sunset: 'assets/Restaurants/Zima/rest_zima_1.jpg',
    night: 'assets/Restaurants/Zima/rest_zima_1.jpg'
};
const TODAY_HERO_POS = { morning: '50% 60%', day: '50% 55%', sunset: '50% 60%', night: '50% 60%' };
/* Stay empty until staff provide verified values (spec §0.2, Appendix 1). */
const CONCIERGE = { phone: '', whatsapp: '', email: '' };
const IBEROCASH_NOTE = '';

const VIEWS = ['today', 'dine', 'explore', 'spa', 'saved', 'resorts'];
const VIEW_TITLE = { today: 'Today', dine: 'Dine', explore: 'Explore', spa: 'Spa & Wellness', saved: 'Saved', resorts: 'Our resorts' };
const TAB_OF = { today: 'today', dine: 'dine', explore: 'explore', spa: 'spa', saved: 'saved', resorts: 'today' };
const PARENT_BY_TYPE = { food: 'dine', fun: 'explore', golf: 'explore', store: 'explore', spa: 'spa', club: 'resorts' };
const OV_EL = { detail: 'ovDetail', photos: 'ovLightbox', menus: 'ovAction', pdf: 'ovMedia', video: 'ovMedia', request: 'ovRequest',
    ticket: 'ovTicket', savedshow: 'ovTicket', search: 'ovSearch', settings: 'ovSettings' };
// Phone tiles cap image density at ~2× on 3× screens ((min-resolution:2.5dppx) → ⅔ of the slot):
// a 480w photo on a 220px tile is indistinguishable at arm's length and half the bytes of 800w.
const CARD_SIZES = '(min-width:1024px) 270px, (min-width:600px) 30vw, (min-resolution:2.5dppx) 31vw, 46vw';

/* ---------- 1. store: never throws, returns null ---------- */
const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, String(v)); return true; } catch (e) { return false; } },
    remove(k) { try { localStorage.removeItem(k); } catch (e) { /* ignore */ } },
    json(k, fb = null) { const s = store.get(k); if (s == null) return fb; try { const v = JSON.parse(s); return v == null ? fb : v; } catch (e) { return fb; } },
    setJSON(k, v) { return store.set(k, JSON.stringify(v)); },
    sget(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } },
    sset(k, v) { try { sessionStorage.setItem(k, String(v)); } catch (e) { /* ignore */ } },
    sremove(k) { try { sessionStorage.removeItem(k); } catch (e) { /* ignore */ } }
};

/* ---------- 2. Data + normalize (§B.10) ---------- */
const TYPES = new Set(['club', 'food', 'fun', 'spa', 'golf', 'store']);
let appData = {};
const strArr = a => Array.isArray(a) ? a.filter(x => typeof x === 'string' && x.trim()).map(x => x.trim()) : (typeof a === 'string' && a.trim() ? [a.trim()] : []);
function normalize(src) {
    const out = {};
    if (!src || typeof src !== 'object') return out;
    Object.keys(src).forEach(k => {
        const v = src[k];
        if (!v || typeof v !== 'object' || Array.isArray(v) || typeof v.title !== 'string' || !TYPES.has(v.type)) {
            console.warn('[ib] skipped invalid catalog entry:', k);
            return;
        }
        const it = Object.assign({}, v);
        it.sub = typeof v.sub === 'string' ? v.sub : '';
        it.desc = typeof v.desc === 'string' ? v.desc : '';
        it.gallery = strArr(v.gallery);
        it.pdfs = Array.isArray(v.pdfs) ? v.pdfs.filter(p => p && typeof p.url === 'string' && p.url).map(p => ({ label: typeof p.label === 'string' ? p.label : '', url: p.url })) : [];
        it.itinerary = strArr(v.itinerary);
        it.essentials = strArr(v.essentials);
        ['pdf', 'video', 'partnerLogo', 'logo', 'time', 'duration', 'bookUrl', 'phone', 'whatsapp', 'email', 'address', 'bookingNote']
            .forEach(f => { if (typeof it[f] !== 'string' || !it[f].trim()) delete it[f]; });
        if (it.hours != null) it.hours = strArr(it.hours);
        out[k] = it;
    });
    return out;
}
function loadData() {
    const published = typeof defaultData !== 'undefined' ? defaultData : {};
    S.preview = store.get('ib_admin_preview') === '1';
    let data = null;
    if (S.preview) { // staff preview of unexported admin edits (the guest app never writes ib_app_data)
        const local = normalize(store.json('ib_app_data'));
        if (Object.keys(local).length) data = local;
    }
    appData = data || normalize(published);
    buildFacets(appData);
}

/* ---------- 3. State + saved list ---------- */
const S = {
    preview: false,
    inHouse: store.get('ib_in_house') === 'true',
    saved: [],
    info: null,          // phaseInfo(): {phase, late, sun, now, theme, pref, override}
    route: null,
    view: null,
    scroll: new Map(),   // view → scrollY
    dirty: new Set(VIEWS),
    tabHref: {},         // view → last hash (keeps filters when you come back to a tab)
    filt: { dine: { f: new Set(), q: '' }, explore: { f: new Set(), q: '' } },
    shared: null,        // Saved ?ids= list
    detailKey: null
};
function loadSaved() {
    const a = store.json('ib_saved', []);
    S.saved = Array.isArray(a) ? a.filter((k, i) => typeof k === 'string' && appData[k] && a.indexOf(k) === i) : [];
}
const isSaved = k => S.saved.includes(k);
function setSaved(k, on) {
    if (!appData[k] || on === isSaved(k)) return;
    if (on) S.saved.push(k); else S.saved = S.saved.filter(x => x !== k);
    store.setJSON('ib_saved', S.saved);
    $$('[data-action="save"]').forEach(b => { if ((b.dataset.key || S.detailKey) === k) b.setAttribute('aria-pressed', String(on)); });
    updateBadge();
    S.dirty.add('saved'); S.dirty.add('today');
    if (S.view === 'saved' && !Overlay.stack.length) renderView('saved');
}
function toggleSave(k, btn) {
    if (!appData[k]) return;
    const on = !isSaved(k), title = cleanTitle(appData[k]);
    setSaved(k, on);
    if (on) {
        if (btn) { btn.classList.remove('is-pulse'); void btn.offsetWidth; btn.classList.add('is-pulse'); }
        try { navigator.vibrate && navigator.vibrate(8); } catch (e) { /* ignore */ }
        announce(`Saved ${title}. ${plural(S.saved.length, 'item')} saved.`);
    } else {
        toast(`Removed ${title}`, { action: 'Undo', onAction: () => setSaved(k, true) });
    }
}
function updateBadge() {
    const n = S.saved.length;
    const b = $('.tab__badge'), tab = $('.tab[data-tab="saved"]'), c = $('.topnav__count');
    b.hidden = !n; b.textContent = n > 99 ? '99+' : String(n);
    tab.setAttribute('aria-label', n ? `Saved, ${plural(n, 'item')}` : 'Saved');
    c.hidden = !n; c.textContent = String(n);
}

/* ---------- 4. DOM helpers, live region, toast ---------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const viewEl = v => $(`.view[data-view="${v}"]`);
const icon = (id, cls) => `<svg class="ic${cls ? ' ' + cls : ''}" aria-hidden="true"><use href="#i-${id}"/></svg>`;
const mq = q => window.matchMedia(q).matches;
const reduceMotion = () => mq('(prefers-reduced-motion: reduce)');
const isLg = () => mq('(min-width:1024px)');
const finePointer = () => mq('(hover:hover) and (pointer:fine)');
const isLandPhone = () => mq('(orientation:landscape) and (max-height:500px)');
/* Detail sheet layout: phone bottom sheet, or two panes (lg dialog / landscape phone). */
const twoPane = () => isLg() || isLandPhone();
const itemHash = (k, rest) => '#/item/' + encodeURIComponent(k) + (rest || '');
function safeTopPx() { const el = $('.statusbar-scrim'); return el ? el.getBoundingClientRect().height : 0; }

function announce(msg) {
    const el = $('#live');
    el.textContent = '';
    setTimeout(() => { el.textContent = msg; }, 60);
}
let toastTimer = 0;
function toast(msg, o) {
    o = o || {};
    const host = $('.toast-host');
    clearTimeout(toastTimer);
    host.textContent = '';
    const t = document.createElement('div');
    t.className = 'toast';
    const span = document.createElement('span');
    span.textContent = msg;
    t.append(span);
    if (o.action) {
        const b = document.createElement('button');
        b.type = 'button'; b.className = 'toast__action'; b.textContent = o.action;
        b.addEventListener('click', () => { hideToast(); if (o.onAction) o.onAction(); });
        t.append(b);
    }
    host.append(t);
    void t.offsetWidth;
    t.classList.add('is-in');
    toastTimer = setTimeout(hideToast, o.ms || (o.action ? 5000 : 3000));
}
function hideToast() {
    const t = $('.toast-host .toast');
    if (!t) return;
    t.classList.remove('is-in');
    setTimeout(() => t.remove(), 220);
}
async function copyText(text) {
    try { await navigator.clipboard.writeText(text); return true; } catch (e) { /* fall through */ }
    try {
        const ta = document.createElement('textarea');
        ta.value = text; ta.setAttribute('readonly', ''); ta.className = 'sr-only';
        document.body.append(ta); ta.select();
        const ok = document.execCommand('copy'); ta.remove(); return ok;
    } catch (e) { return false; }
}

/* ---------- 5. Theme / phase / clock (§B.7) ---------- */
function applyTheme() {
    let info;
    try { info = window.IB_TIME && IB_TIME.apply ? IB_TIME.apply() : phaseInfo(); } catch (e) { info = phaseInfo(); }
    const prev = S.info;
    S.info = info;
    if (prev && (prev.phase !== info.phase || prev.late !== info.late)) {
        S.dirty.add('today');
        if (S.view === 'today') renderView('today');
    }
    return info;
}
/* Minute tick: theme/phase, Today context line, open/closed status lines. Paused while hidden. */
function tick() {
    if (document.hidden) return;
    applyTheme();
    const ctx = $('[data-live="context"]');
    if (ctx && S.info) ctx.textContent = contextLine(S.info);
    $$('[data-status-key]').forEach(el => {
        const F = facet(el.dataset.statusKey);
        if (!F) return;
        const st = openState(F.item);
        el.className = `status status--${st.state}`;
        el.textContent = st.text;
    });
}
function toggleTimeMode() { // console-only debug helper (no guest UI calls it)
    const order = ['', 'morning', 'day', 'sunset', 'night'];
    const cur = store.sget('ib_time_override') || '';
    const next = order[(order.indexOf(cur) + 1) % order.length];
    if (next) store.sset('ib_time_override', next); else store.sremove('ib_time_override');
    applyTheme();
    S.dirty.add('today'); if (S.view === 'today') renderView('today');
    toast(next ? `Preview: ${next[0].toUpperCase() + next.slice(1)}` : 'Preview: Auto (Aruba time)');
}

/* ---------- 6. Shell: tabs, app bar, keyboard, network ---------- */
function updateTabs(view) {
    const tab = TAB_OF[view];
    $$('.tab, .topnav__link').forEach(a => {
        if (a.dataset.tab === tab) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
        const h = S.tabHref[a.dataset.tab];
        if (h) a.setAttribute('href', h);
    });
}
let titleIO = null, heroIO = null;
function setAppbar(shown) {
    const bar = $('.appbar'), btn = $('.appbar__search');
    bar.classList.toggle('is-shown', shown);
    bar.setAttribute('aria-hidden', String(!shown));
    btn.tabIndex = shown ? 0 : -1;
}
function observeTitle(view) {
    if (titleIO) titleIO.disconnect();
    if (heroIO) heroIO.disconnect();
    const el = viewEl(view);
    const target = view === 'today' ? $('.today__greeting', el) : $('.view-title', el);
    $('.appbar__title').textContent = view === 'today' ? 'Iberostar Aruba' : VIEW_TITLE[view];
    const top = Math.round(safeTopPx() + 44);
    setAppbar(false);
    if (!target || !('IntersectionObserver' in window)) return;
    titleIO = new IntersectionObserver(es => {
        const e = es[es.length - 1];
        setAppbar(!e.isIntersecting && e.boundingClientRect.top < top);
    }, { rootMargin: `-${top}px 0px 0px 0px` });
    titleIO.observe(target);
    const scrim = $('.statusbar-scrim');
    scrim.classList.remove('is-over-image');
    const hero = view === 'today' && $('.today-hero', el);
    if (hero) {
        const band = Math.max(1, Math.round(safeTopPx()) + 1);
        heroIO = new IntersectionObserver(es => {
            const e = es[es.length - 1];
            scrim.classList.toggle('is-over-image', e.isIntersecting);
            hero.classList.toggle('is-live', e.isIntersecting || hero.getBoundingClientRect().bottom > 0);
        }, { rootMargin: `0px 0px -${Math.max(0, window.innerHeight - band)}px 0px` });
        heroIO.observe(hero);
        // Ken Burns runs only while the hero is on screen
        const liveIO = new IntersectionObserver(es => hero.classList.toggle('is-live', es[es.length - 1].isIntersecting));
        liveIO.observe(hero);
        const prevDisconnect = heroIO.disconnect.bind(heroIO);
        heroIO.disconnect = () => { prevDisconnect(); liveIO.disconnect(); };
    }
}
function initKeyboardDetect() {
    const html = document.documentElement;
    const vv = window.visualViewport;
    if (vv) {
        vv.addEventListener('resize', () => html.classList.toggle('kb-open', window.innerHeight - vv.height > 150));
    }
    const isField = t => t && t.matches && t.matches('input:not([type=checkbox]):not([type=radio]), textarea, select');
    document.addEventListener('focusin', e => { if (!vv && isField(e.target) && mq('(pointer:coarse)')) html.classList.add('kb-open'); });
    document.addEventListener('focusout', e => { if (!vv && isField(e.target)) html.classList.remove('kb-open'); });
}
/* Offline: the pill, and video links/buttons disabled with the caption "Video needs Wi-Fi". */
function syncNet() {
    const off = navigator.onLine === false;
    const pill = $('.net-pill');
    if (pill) pill.hidden = !off;
    $$('[data-needs-net]').forEach(el => {
        if (el.tagName === 'BUTTON') el.disabled = off;
        if (off) el.setAttribute('aria-disabled', 'true'); else el.removeAttribute('aria-disabled');
    });
    $$('[data-net-cap]').forEach(p => { p.textContent = off ? 'Video needs Wi-Fi' : p.dataset.netCap; p.classList.toggle('is-off', off); });
}
function initNetwork() {
    window.addEventListener('online', syncNet);
    window.addEventListener('offline', syncNet);
    syncNet();
}

/* ---------- 7. Overlay manager (§B.9) ---------- */
let scrollLockY = 0;
const Overlay = {
    stack: [], // [{el, opener, id}]
    open(el, o) {
        o = o || {};
        clearTimeout(el._closeT);
        const opener = o.opener || document.activeElement;
        this.stack.push({ el, opener, id: o.id || el.id });
        el.hidden = false;
        this._inert();
        const html = document.documentElement;
        if (!html.classList.contains('ov-open')) {
            scrollLockY = window.scrollY;
            if (html.classList.contains('device-ios')) {
                const b = document.body.style;
                b.position = 'fixed'; b.top = `-${scrollLockY}px`; b.left = '0'; b.right = '0'; b.width = '100%';
            }
            html.classList.add('ov-open');
        }
        void el.offsetWidth; // commit the un-hidden state so the open transition runs
        el.classList.add('is-open');
        if (o.focusNow) { const f = o.focusNow; f.focus({ preventScroll: true }); }
        else requestAnimationFrame(() => {
            const f = el.querySelector('[data-autofocus]') || el.querySelector('[tabindex="-1"]') || el.querySelector('h1,h2,button,a[href]');
            if (f) f.focus({ preventScroll: true });
        });
    },
    close(el, o) {
        o = o || {};
        const i = this.stack.findIndex(s => s.el === el);
        if (i < 0) return;
        const [entry] = this.stack.splice(i, 1);
        el.classList.remove('is-open');
        clearTimeout(el._closeT);
        el._closeT = setTimeout(() => {
            if (this.stack.some(s => s.el === el)) return; // re-opened meanwhile
            el.hidden = true;
            if (el._onClosed) el._onClosed();
        }, reduceMotion() ? 0 : 450);
        this._inert();
        if (!this.stack.length) {
            const html = document.documentElement;
            html.classList.remove('ov-open');
            if (html.classList.contains('device-ios')) {
                const b = document.body.style;
                b.position = ''; b.top = ''; b.left = ''; b.right = ''; b.width = '';
                window.scrollTo(0, scrollLockY);
            }
        }
        if (o.restoreFocus === false) return;
        const op = entry.opener;
        if (op && op.isConnected && !op.closest('[hidden],[inert]') && op !== document.body) { op.focus({ preventScroll: true }); return; }
        const key = o.key;
        const card = key && $(`.view:not([hidden]) [data-key="${CSS.escape(key)}"] .card__link`);
        if (card) { card.focus({ preventScroll: true }); return; }
        const h = $('.view:not([hidden]) h1');
        if (h) h.focus({ preventScroll: true });
    },
    _inert() {
        const top = this.stack[this.stack.length - 1];
        $$('#main, .tabbar, .topnav, .appbar, .skip-link').forEach(e => { e.inert = !!top; });
        $$('.ov').forEach(o => { o.inert = !!top && o !== top.el; });
    },
    top() { return this.stack[this.stack.length - 1] || null; }
};
/* Fallback focus trap where `inert` is unsupported (iOS < 15.5). */
function trapTab(e) {
    const top = Overlay.top();
    if (!top || 'inert' in HTMLElement.prototype) return;
    const els = $$('a[href],button:not([disabled]),input,select,textarea,[tabindex]:not([tabindex="-1"])', top.el)
        .filter(x => !x.closest('[inert]') && (x.checkVisibility ? x.checkVisibility() : x.offsetParent !== null));
    if (!els.length) return;
    const first = els[0], last = els[els.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
}
function closeTop() {
    const r = S.route;
    if (!r || !r.overlays.length) return;
    const st = history.state;
    if (st && st.ib && st.idx > 0) history.back();
    else go(routeHash(r, r.overlays.length - 1), { replace: true });
}
function closeModal() { closeTop(); }

/* ---------- 8. Router (§B.9) ----------
   History model: views replace each other, except leaving Today pushes (Back → Today → exit).
   Overlays push. Filters, queries and lightbox paging replace. A cold deep link to an overlay
   is rebuilt as [Today] → [parent view] → [overlay levels…] so Back peels one level at a time.
   history.state = {ib:1, idx, fromToday?, keep?}; `keep` = hash of an overlay stack (search)
   that stays open underneath an item pushed from it. */
function parseRoute(hash) {
    hash = String(hash || '').replace(/^#/, '');
    const qi = hash.indexOf('?');
    const path = qi >= 0 ? hash.slice(0, qi) : hash;
    const qs = new URLSearchParams(qi >= 0 ? hash.slice(qi + 1) : '');
    const seg = path.split('/').filter(Boolean).map(s => { try { return decodeURIComponent(s); } catch (e) { return s; } });
    const list = k => (qs.get(k) || '').split(',').map(s => s.trim()).filter(Boolean);
    const r = { view: null, parent: null, f: list('f'), q: qs.get('q') || '', ids: list('ids'), overlays: [], bad: false, missing: null };
    const head = seg[0] || 'today';
    if (VIEWS.includes(head)) {
        r.view = head;
        if (head === 'saved' && seg[1] === 'show') r.overlays.push({ type: 'savedshow' });
        else if (seg.length > 1) r.bad = true;
    } else if (head === 'search') r.overlays.push({ type: 'search' });
    else if (head === 'settings') r.overlays.push({ type: 'settings' });
    else if (head === 'item' && seg[1]) {
        const key = seg[1];
        if (!appData[key]) r.missing = key;
        else {
            r.parent = PARENT_BY_TYPE[appData[key].type] || 'today';
            r.overlays.push({ type: 'detail', key });
            const sub = seg[2];
            if (sub === 'photos') r.overlays.push({ type: 'photos', key, n: Math.max(1, parseInt(seg[3], 10) || 1) });
            else if (sub === 'menu') r.overlays.push(seg[3] != null ? { type: 'pdf', key, i: Math.max(0, parseInt(seg[3], 10) || 0) } : { type: 'menus', key });
            else if (sub === 'video') r.overlays.push({ type: 'video', key });
            else if (sub === 'request') { r.overlays.push({ type: 'request', key }); if (seg[3] === 'show') r.overlays.push({ type: 'ticket', key }); }
            else if (sub) r.bad = true;
        }
    } else r.bad = true;
    return r;
}
const ovId = o => o.type + ':' + (o.key || '');
function ovHash(o, q) {
    switch (o.type) {
        case 'search': return '#/search' + (q ? '?q=' + encodeURIComponent(q) : '');
        case 'settings': return '#/settings';
        case 'savedshow': return '#/saved/show';
        case 'detail': return itemHash(o.key);
        case 'photos': return itemHash(o.key, '/photos/' + o.n);
        case 'menus': return itemHash(o.key, '/menu');
        case 'pdf': return itemHash(o.key, '/menu/' + o.i);
        case 'video': return itemHash(o.key, '/video');
        case 'request': return itemHash(o.key, '/request');
        case 'ticket': return itemHash(o.key, '/request/show');
    }
    return '#/today';
}
/* Hash of route r truncated to `depth` overlay levels (0 = the view itself). */
function routeHash(r, depth) {
    if (depth <= 0) return S.tabHref[r.view] || '#/' + (r.view || 'today');
    return ovHash(r.overlays[depth - 1], r.overlays[depth - 1].type === 'search' ? searchState.q : '');
}
function viewHash(v) {
    if (v === 'dine' || v === 'explore') {
        const st = S.filt[v], p = [];
        if (st.f.size) p.push('f=' + [...st.f].map(encodeURIComponent).join(','));
        if (st.q) p.push('q=' + encodeURIComponent(st.q));
        return '#/' + v + (p.length ? '?' + p.join('&') : '');
    }
    if (v === 'saved' && S.shared) return '#/saved?ids=' + S.shared.map(encodeURIComponent).join(',');
    return '#/' + v;
}
const histIdx = () => (history.state && history.state.ib ? history.state.idx || 0 : 0);
function go(hash, o) {
    o = o || {};
    const st = history.state || {};
    const extra = o.state || {};
    if (o.replace) history.replaceState(Object.assign({ ib: 1, idx: histIdx(), fromToday: st.fromToday, keep: st.keep }, extra), '', hash);
    else history.pushState(Object.assign({ ib: 1, idx: histIdx() + 1 }, extra), '', hash);
    render(parseRoute(hash), { nav: !o.silent });
}
/* Decides push vs replace for an in-app link (the delegated click handler calls this). */
function navigate(hash, src) {
    const cur = S.route || parseRoute(location.hash);
    const t = parseRoute(hash);
    const st = history.state || {};
    if (t.bad || t.missing) { go(hash, { replace: true }); return; }
    if (!t.overlays.length) {
        if (cur.overlays.length) { go(hash); return; }               // view link from inside an overlay
        if (t.view === S.view) {
            if (hash === location.hash || hash === '#/' + S.view) {  // re-tap the active tab → top
                window.scrollTo({ top: 0, behavior: reduceMotion() ? 'auto' : 'smooth' });
                return;
            }
            go(hash, { replace: true }); return;                    // same view, new filters
        }
        if (t.view === 'today' && st.fromToday && st.idx > 0) { history.back(); return; }
        if (S.view === 'today') { go(hash, { state: { fromToday: true } }); return; }
        go(hash, { replace: true, state: { fromToday: st.fromToday } }); return;
    }
    // Overlay target. Keep an open search underneath an item pushed from it.
    const extra = {};
    const curTop = cur.overlays[0];
    if (curTop && curTop.type === 'search' && t.overlays[0].type === 'detail') extra.keep = ovHash(curTop, searchState.q);
    else if (st.keep && cur.overlays.length && t.overlays[0].type === 'detail') extra.keep = st.keep;
    if (src && src.dataset && src.dataset.replace === '1') { go(hash, { replace: true, state: extra }); return; }
    go(hash, { state: extra });
}
let lastRendered = '';
function render(route, o) {
    o = o || {};
    try {
        if (route.missing) {
            toast('That item is no longer available.');
            history.replaceState({ ib: 1, idx: histIdx() }, '', S.tabHref[S.view] || '#/today');
            render(parseRoute(location.hash), o);
            return;
        }
        if (route.bad) { history.replaceState({ ib: 1, idx: histIdx() }, '', '#/today'); render(parseRoute('#/today'), o); return; }
        const st = history.state;
        if (st && st.keep && route.overlays.length) {
            const k = parseRoute(st.keep);
            if (!k.bad && !k.missing) route.overlays = k.overlays.concat(route.overlays.filter(x => !k.overlays.some(y => ovId(y) === ovId(x))));
        }
        route.view = route.view || S.view || route.parent || 'today';
        showView(route.view, route, o);
        syncOverlays(route, o);
        S.route = route;
        lastRendered = location.hash;
        updateDocTitle();
    } catch (err) {
        console.error('[ib] render failed', err);
        renderError(viewEl(S.view || 'today'));
    }
}
function showView(v, route, o) {
    const changed = S.view !== v;
    if (!route.overlays.length) applyViewParams(v, route);
    if (changed) {
        if (S.view) { S.scroll.set(S.view, window.scrollY); viewEl(S.view).hidden = true; }
        S.view = v;
        const el = viewEl(v);
        if (S.dirty.has(v) || !el.firstElementChild) renderView(v);
        el.hidden = false;
        updateTabs(v);
        if (!o.initial) maybeReshowUpdate();
        const y = S.scroll.get(v) || 0;
        if (!Overlay.stack.length) { window.scrollTo(0, y); requestAnimationFrame(() => window.scrollTo(0, y)); }
        observeTitle(v);
        if (o.nav && !route.overlays.length) {
            const h = el.querySelector('h1');
            if (h) h.focus({ preventScroll: true });
            announce(viewAnnouncement(v));
        }
    } else if (S.dirty.has(v)) renderView(v);
    if (!route.overlays.length) {
        S.tabHref[v] = location.hash && location.hash !== '#' ? location.hash : '#/' + v;
        updateTabs(v);
    }
}
function viewAnnouncement(v) {
    const n = t => [...FACETS.values()].filter(F => t(F)).length;
    if (v === 'dine') return `Dine, ${plural(n(F => F.item.type === 'food'), 'restaurant')}`;
    if (v === 'explore') return `Explore, ${plural(exploreItems().length, 'experience')}`;
    if (v === 'saved') return `Saved, ${plural(S.saved.length, 'item')}`;
    return VIEW_TITLE[v];
}
function updateDocTitle() {
    const top = S.route && S.route.overlays[S.route.overlays.length - 1];
    const key = top && top.key;
    const base = 'Iberostar Aruba';
    if (key && appData[key]) document.title = `${cleanTitle(appData[key])} · ${base}`;
    else if (top && top.type === 'search') document.title = `Search · ${base}`;
    else if (top && top.type === 'settings') document.title = `Settings · ${base}`;
    else document.title = S.view && S.view !== 'today' ? `${VIEW_TITLE[S.view]} · ${base}` : base;
}
function applyViewParams(v, route) {
    if (v === 'dine' || v === 'explore') {
        const st = S.filt[v];
        const f = new Set(route.f), q = route.q;
        const same = f.size === st.f.size && [...f].every(x => st.f.has(x)) && q === st.q;
        if (!same) {
            st.f = f; st.q = q;
            if (viewEl(v).firstElementChild && !S.dirty.has(v)) syncFilterUI(v); else S.dirty.add(v);
        }
    } else if (v === 'saved') {
        const ids = route.ids.length ? route.ids.filter(k => appData[k]) : null;
        if (JSON.stringify(ids) !== JSON.stringify(S.shared)) { S.shared = ids; S.dirty.add('saved'); }
    }
}
/* Close overlays deeper than the route, then open the missing ones in order. */
function syncOverlays(route, o) {
    const want = route.overlays;
    const stack = Overlay.stack;
    let i = 0;
    while (i < stack.length && i < want.length && stack[i].id === ovId(want[i])) { updateOverlay(want[i], i === want.length - 1, route); i++; }
    for (let j = stack.length - 1; j >= i; j--) {
        const e = stack[j];
        const key = e.id.split(':')[1];
        Overlay.close(e.el, { restoreFocus: j === i && i >= want.length, key });
    }
    for (let j = i; j < want.length; j++) openOverlay(want[j], o);
    document.documentElement.classList.toggle('has-actionbar', !!want.length && want[want.length - 1].type === 'detail');
    document.documentElement.classList.toggle('has-rqbar', !!want.length && want[want.length - 1].type === 'request');
}
function openOverlay(ov, o) {
    const el = document.getElementById(OV_EL[ov.type]);
    const fn = OV_RENDER[ov.type];
    const res = fn ? fn(ov, el, o) : null;
    Overlay.open(el, { id: ovId(ov), focusNow: res && res.focusNow });
    if (res && res.after) res.after();
}
function updateOverlay(ov, isTop, route) {
    if (ov.type === 'photos') lbGoTo(ov.n, false);
    if (ov.type === 'search' && isTop) { // Back/forward or a manual edit changed ?q= under an open search
        const q = route.q || '';
        const input = $('#searchInput');
        if (input && q.trim() !== searchState.q.trim()) { input.value = q; searchState.q = q; searchState.showAll.clear(); renderSearchResults(); }
    }
}
function renderView(v) {
    const el = viewEl(v);
    try {
        VIEW_RENDER[v](el);
        S.dirty.delete(v);
    } catch (err) {
        console.error('[ib] view render failed:', v, err);
        renderError(el);
    }
    sweepImages(el);
}
function renderError(el) {
    if (!el) return;
    el.innerHTML = `<div class="wrap view-head"><div class="empty">${icon('info')}<h1 class="view-title" tabindex="-1">Something went wrong</h1>
      <p>Please reload the guide.</p><button type="button" class="btn btn--primary" data-action="reload">Reload</button>
      ${S.preview ? '<button type="button" class="btn btn--secondary" data-action="exit-preview">Exit preview</button>' : ''}</div></div>`;
}

/* ---------- 9. Card components (§B.4) ---------- */
function phData(F) {
    const p = phSpecFor(F);
    return ` data-ph-name="${esc(p.name)}" data-ph-icon="${esc(p.icon)}"${p.logo ? ` data-ph-logo="${esc(p.logo)}"` : ''}`;
}
/* <div class="media …">img | .ph</div> */
function mediaBox(F, o) {
    o = o || {};
    const src = o.src !== undefined ? o.src : F.item.gallery[0];
    const cls = 'media' + (o.cls ? ' ' + o.cls : '');
    if (!src) return `<div class="${cls}"${phData(F)}>${phHTML(phSpecFor(F))}</div>`;
    // non-eager images get data-src and are released by image-utils observeLazy() near the viewport
    return `<div class="${cls}"${mediaAttrs(src, o.style)}${phData(F)}>${imgHTML(src, { widths: o.widths || [480, 800], sizes: o.sizes, eager: o.eager, priority: o.priority, alt: o.alt || '', lazySrc: !o.eager })}</div>`;
}
function saveBtn(F, cls) {
    const on = isSaved(F.key);
    return `<button type="button" class="save${cls ? ' ' + cls : ''}" data-action="save" data-key="${esc(F.key)}" aria-pressed="${on}" aria-label="Save ${esc(cleanTitle(F.item))}">${icon('heart', 'ic--off')}${icon('heart-fill', 'ic--on')}</button>`;
}
/* variant: 'tile' (Dine grid, rails) | 'row' (Saved, xs) | 'explore' (row <600px, tile ≥600px) */
function cardHTML(F, o) {
    o = o || {};
    const it = F.item, m = cardMeta(F), v = o.variant || 'tile';
    const cls = v === 'row' ? 'card card--row' : v === 'explore' ? 'card card--row card--to-tile' : 'card card--tile';
    const sizes = o.sizes || (v === 'tile' ? CARD_SIZES : v === 'explore' ? '(min-width:1024px) 370px, (min-width:600px) 45vw, 96px' : '96px');
    const lines = o.reason
        ? `<p class="card__reason">${esc(o.reason)}</p>`
        : (m.meta ? `<p class="card__meta">${m.meta}</p>` : '') + (m.price ? `<p class="card__price">${m.price}</p>` : '');
    const st = !o.reason && m.status && m.status.state !== 'unknown'
        ? `<p class="status status--${m.status.state}" data-status-key="${esc(F.key)}">${esc(m.status.text)}</p>` : '';
    return `<article class="${cls}${o.cls ? ' ' + o.cls : ''}" data-key="${esc(F.key)}">`
        + mediaBox(F, { cls: 'card__media', widths: v === 'row' ? [480] : [480, 800], sizes, eager: o.eager })
        + `<div class="card__body">${m.eyebrow && !o.reason ? `<p class="eyebrow">${m.eyebrow}</p>` : ''}`
        + `<h3 class="card__title"><a class="card__link" href="${itemHash(F.key)}">${esc(cleanTitle(it))}</a></h3>${lines}${st}</div>`
        + (F.status === 'coming-soon' ? '' : saveBtn(F)) + `</article>`;
}
/* Feature card: Spa, Resorts, any group of ≤3 items. */
function featureHTML(F, o) {
    o = o || {};
    const m = cardMeta(F);
    const eyebrow = o.eyebrow != null ? esc(o.eyebrow) : m.eyebrow;
    const meta = o.meta != null ? esc(o.meta) : m.meta;
    return `<article class="card card--feature${o.wide ? ' is-wide' : ''}" data-key="${esc(F.key)}">`
        + mediaBox(F, { cls: 'card__media', widths: [800, 1600], sizes: o.sizes || '(min-width:1024px) 760px, 100vw', eager: o.eager })
        + `<div class="card__overlay"></div><div class="card__body">${eyebrow ? `<p class="eyebrow">${eyebrow}</p>` : ''}`
        + `<h${o.h || 3} class="card__title"><a class="card__link" href="${itemHash(F.key)}">${esc(o.title || cleanTitle(F.item))}</a></h${o.h || 3}>`
        + `${meta ? `<p class="card__meta">${meta}</p>` : ''}</div>${F.status === 'coming-soon' ? '' : saveBtn(F)}</article>`;
}
function csRowHTML(F) {
    const sub = F.item.type === 'club' ? '' : F.item.sub && !/coming soon|in development/i.test(F.item.sub) ? F.item.sub : '';
    return `<div class="cs-row" data-key="${esc(F.key)}"><div class="cs-row__text"><p class="eyebrow">${esc(statusLabel(F.item))}</p>`
        + `<h3 class="cs-row__title"><a class="card__link" href="${itemHash(F.key)}">${esc(cleanTitle(F.item))}</a></h3>`
        + `${sub ? `<p class="cs-row__sub">${esc(sub)}</p>` : ''}</div>${icon('chevron-right')}</div>`;
}
function searchRowHTML(F, q) {
    const m = cardMeta(F);
    const meta = F.item.type === 'fun' ? [F.dur.text, F.from ? 'From ' + fromText(F.from) : ''].filter(Boolean).join(' · ') : stripTags(m.meta) || F.item.sub;
    const eb = F.status === 'coming-soon' ? statusLabel(F.item) : decodeEntities(stripTags(m.eyebrow));
    return `<div class="srow" data-key="${esc(F.key)}">${mediaBox(F, { widths: [480], sizes: '56px', cls: 'srow__thumb' })}<div class="srow__text">`
        + `<a class="srow__title card__link" href="${itemHash(F.key)}">${highlight(cleanTitle(F.item), q)}</a>`
        + `<span class="srow__meta">${highlight(eb, q)}${meta && F.status !== 'coming-soon' ? ' · ' + esc(meta) : ''}</span></div>${icon('chevron-right', 'srow__go')}</div>`;
}
const byOrder = (a, b) => ((a.item.order ?? 1e9) - (b.item.order ?? 1e9)) || a.idx - b.idx;
const facetsWhere = t => [...FACETS.values()].filter(t).sort(byOrder);

/* ---------- 10. Views ---------- */
const INTENTS = {
    morning: [['Breakfast', '#/dine?f=breakfast', 'dine'], ['Snorkel', '#/explore?f=snorkel', 'sail'], ['Island tours', '#/explore?f=island', 'explore'], ['Spa', '#/spa', 'spa'], ['Golf', '#/explore?f=golf', 'flag'], ['Shopping', '#/explore?f=shop', 'bag']],
    day: [['On the water', '#/explore?f=water', 'sail'], ['Off-road', '#/explore?f=offroad', 'explore'], ['Island tours', '#/explore?f=island', 'pin'], ['Spa', '#/spa', 'spa'], ['Golf', '#/explore?f=golf', 'flag'], ['Shopping', '#/explore?f=shop', 'bag']],
    sunset: [['Sunset', '#/explore?f=sunset', 'today'], ['Dinner', '#/dine?f=dinner', 'dine'], ['Drinks', '#/dine?f=drinks', 'glass'], ['At Joia', '#/dine?f=joia', 'pin'], ['Spa', '#/spa', 'spa']],
    night: [['Dinner', '#/dine?f=dinner', 'dine'], ['Drinks', '#/dine?f=drinks', 'glass'], ['At Joia', '#/dine?f=joia', 'pin'], ['Plan tomorrow', '#/explore', 'explore'], ['Spa', '#/spa', 'spa']]
};
const PICKS_TITLE = { morning: 'This morning', day: 'This afternoon', sunset: 'Golden hour', night: 'Tonight', late: 'Plan tomorrow' };
const PICKS_ALL = { morning: '#/explore', day: '#/explore?f=water', sunset: '#/explore?f=sunset', night: '#/dine?f=dinner', late: '#/explore' };
function intentHasResults(href) {
    const r = parseRoute(href);
    if (r.view === 'spa') return facetsWhere(F => F.item.type === 'spa').length > 0;
    if (r.view !== 'dine' && r.view !== 'explore') return true;
    const items = r.view === 'dine' ? dineItems() : exploreItems();
    if (!r.f.length) return items.length > 0;
    const chips = chipDefs(r.view, items);
    return items.some(F => r.f.every(id => { const c = chips.find(x => x.id === id); return c && c.test(F); }));
}
function railHTML(o) {
    return `<section class="rail${o.cls ? ' ' + o.cls : ''}" aria-labelledby="${o.id}"><div class="wrap rail__head"><div>`
        + `${o.eyebrow ? `<p class="eyebrow">${esc(o.eyebrow)}</p>` : ''}<h2 class="rail__title" id="${o.id}">${esc(o.title)}</h2></div>`
        + `${o.all ? `<a class="btn--text" href="${o.all}">${esc(o.allLabel || 'See all')}${icon('chevron-right')}</a>` : ''}</div>`
        + `<div class="rail__outer"><div class="rail__track${o.cols === 4 ? ' rail__track--4' : ''}${o.cols === 5 ? ' rail__track--5' : ''}">${o.body}</div></div>${o.after || ''}</section>`;
}
function renderToday(el) {
    const info = S.info || phaseInfo();
    const ph = info.phase, pkey = ph === 'night' && info.late ? 'late' : ph;
    const hero = TODAY_HERO[ph] || TODAY_HERO.day;
    const intents = (INTENTS[ph] || INTENTS.day).filter(i => intentHasResults(i[1]));
    const picks = todayPicks(info, { inHouse: S.inHouse });
    let h = `<div class="today-top"><section class="today-hero" aria-labelledby="h-today">`
        + `<div class="today-hero__media media"${mediaAttrs(hero, '--pos:' + (TODAY_HERO_POS[ph] || '50% 50%'))}>${imgHTML(hero, { widths: [800, 1600], sizes: '(min-width:1024px) 1200px, 100vw', eager: true, priority: true, alt: '' })}</div>`
        + `<div class="today-hero__scrim"></div>${ph === 'night' ? starfieldSVG(info.now) : ''}`
        + `<div class="today-hero__top"><a class="today-hero__brand on-photo" href="#/today" aria-label="Iberostar Aruba"><img src="assets/Logos/logo_iberostar_ivory.png" alt="" height="26" data-noph><span class="brand__word">Iberostar <em>Aruba</em></span></a>`
        + `<a class="icon-btn on-photo" href="#/settings" aria-label="Settings">${icon('sliders')}</a></div>`
        + `<div class="today-hero__bottom"><div class="today-hero__text"><p class="eyebrow">${esc(dateEyebrow(info.now))} · Eagle Beach</p>`
        + `<h1 class="today__greeting" id="h-today" tabindex="-1"><span lang="pap">${esc(greetingFor(ph))}</span><span class="sr-only"> Welcome to Iberostar Aruba</span></h1>`
        + `<p class="today__context" data-live="context">${esc(contextLine(info))}</p></div>`
        + `<a class="searchpill" href="#/search" data-action="open-search">${icon('search')}<span>Search dining, tours, spa…</span></a></div></section>`
        + `<nav class="intents" aria-label="Quick picks">${intents.map(i => `<a class="chip chip--intent" href="${i[1]}">${icon(i[2])}${esc(i[0])}</a>`).join('')}</nav></div>`;
    if (picks.length) {
        h += railHTML({ id: 'r-picks', title: PICKS_TITLE[pkey], all: PICKS_ALL[pkey], cols: 3,
            body: picks.map((p, i) => cardHTML(facet(p.key), { reason: p.reason, eager: i < 2, sizes: '(min-width:1024px) 370px, (min-width:600px) 260px, (min-resolution:2.5dppx) 147px, 220px' })).join('') });
    }
    const spa = facet('SpaPromo');
    const spot = spa && !spa.status ? `<article class="card spotlight" data-key="SpaPromo">${mediaBox(spa, { cls: 'card__media', widths: [480], sizes: '120px' })}`
        + `<div class="card__body"><span class="chip-comp">Complimentary</span><h3 class="card__title"><a class="card__link" href="${itemHash('SpaPromo')}">${esc(cleanTitle(spa.item))}</a></h3>`
        + `<p class="card__meta">${esc([spa.dur.text, 'Spa Sensations at Joia'].filter(Boolean).join(' · '))}</p></div></article>` : '';
    const strip = S.saved.length ? `<section class="saved-sec" aria-labelledby="r-saved"><div class="rail__head"><h2 class="rail__title" id="r-saved">Your plans · ${S.saved.length}</h2><a class="btn--text" href="#/saved">View${icon('chevron-right')}</a></div>`
        + `<div class="saved-strip">${S.saved.slice(0, 5).map(k => { const F = facet(k); return `<a class="saved-pill" href="${itemHash(k)}">${mediaBox(F, { widths: [480], sizes: '28px' })}<span>${esc(cleanTitle(F.item))}</span></a>`; }).join('')}</div></section>` : '';
    if (spot || strip) h += `<div class="wrap today-duo">${spot ? `<section class="spot-sec" aria-label="Spotlight">${spot}</section>` : ''}${strip}</div>`;
    const joia = facetsWhere(F => F.item.type === 'food' && F.area === 'joia').concat(facetsWhere(F => F.item.type === 'food' && F.area === 'tierra'));
    if (joia.length) h += railHTML({ id: 'r-joia', eyebrow: 'On property', title: 'Dine at Joia', all: '#/dine?f=joia', cols: joia.length === 5 ? 5 : 4, cls: 'below-fold',
        body: joia.map(F => cardHTML(F, { sizes: '(min-width:1024px) 270px, (min-width:600px) 260px, (min-resolution:2.5dppx) 147px, 220px' })).join('') });
    if (ph === 'night') {
        const tm = todayPicks({ phase: 'morning', late: true, now: info.now, sun: info.sun }, { inHouse: S.inHouse }).filter(p => facet(p.key).item.type === 'fun');
        const more = facetsWhere(F => F.item.type === 'fun' && visibleInMode(F.item, S.inHouse) && !tm.some(p => p.key === F.key));
        const list = tm.concat(more.map(F => ({ key: F.key, reason: '' }))).slice(0, 6);
        if (list.length && pkey !== 'late') h += railHTML({ id: 'r-tomorrow', title: 'Plan tomorrow', all: '#/explore', cols: 3, cls: 'below-fold',
            body: list.map(p => cardHTML(facet(p.key), p.reason ? { reason: p.reason, sizes: '(min-width:1024px) 370px, (min-resolution:2.5dppx) 147px, 220px' } : { sizes: '(min-width:1024px) 370px, (min-resolution:2.5dppx) 147px, 220px' })).join('') });
    }
    const clubs = facetsWhere(F => F.item.type === 'club');
    const open = clubs.filter(F => F.status !== 'coming-soon'), soon = clubs.filter(F => F.status === 'coming-soon');
    if (clubs.length) h += railHTML({ id: 'r-resorts', eyebrow: 'Iberostar in Aruba', title: 'Our resorts', all: '#/resorts', cls: 'rail--resorts below-fold', cols: 2,
        body: open.map(F => cardHTML(F, { cls: 'card--wide', sizes: '(min-width:1024px) 560px, (min-resolution:2.5dppx) 174px, 260px' })).join(''),
        after: soon.length ? `<div class="wrap"><div class="cs-list">${soon.map(csRowHTML).join('')}</div></div>` : '' });
    h += `<footer class="wrap today-foot">${a2hsHTML()}<p class="foot-note">Iberostar Aruba guest guide · v${APP_VERSION}</p></footer>`;
    el.innerHTML = h;
}
let deferredInstall = null;
function a2hsHTML() {
    const standalone = mq('(display-mode: standalone)') || navigator.standalone === true;
    if (standalone || store.get('ib_a2hs_dismissed')) return '';
    const btn = deferredInstall ? `<button type="button" class="btn btn--primary" data-action="install">Install</button>` : `<a class="btn btn--secondary" href="qr.html">How</a>`;
    return `<aside class="a2hs" aria-label="Add to Home Screen"><p>Keep Iberostar on your Home Screen. It opens instantly, even offline.</p>${btn}`
        + `<button type="button" class="icon-btn" data-action="a2hs-dismiss" aria-label="Dismiss">${icon('close')}</button></aside>`;
}

function viewHead(v, o) {
    return `<header class="wrap view-head">${o.eyebrow ? `<p class="eyebrow" data-head-eyebrow>${esc(o.eyebrow)}</p>` : ''}`
        + `<h1 class="view-title" id="h-${v}" tabindex="-1">${esc(o.title)}</h1>${o.lede ? `<p class="view-lede${o.ledeOpt ? ' view-lede--opt' : ''}">${esc(o.lede)}</p>` : ''}${o.extra || ''}</header>`;
}
function fieldHTML(v, label) {
    const st = S.filt[v];
    return `<div class="field" role="search">${icon('search', 'field__icon')}<input class="field__input" type="search" enterkeyhint="search" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false"`
        + ` aria-label="${esc(label)}" placeholder="${esc(label)}" data-inline-search="${v}" value="${esc(st.q)}">`
        + `<button type="button" class="field__clear" data-action="field-clear" data-view="${v}" aria-label="Clear search"${st.q ? '' : ' hidden'}>${icon('close')}</button></div>`;
}

/* Dine */
const dineItems = () => facetsWhere(F => F.item.type === 'food');
function renderDine(el) {
    const items = dineItems();
    const nj = items.filter(F => F.area === 'joia').length;
    const withHours = items.filter(F => F.hours.some(h => h.ok)).length;
    const openN = items.filter(F => ['open', 'closing'].includes(openState(F.item).state)).length;
    const eyebrow = `${plural(items.length, 'restaurant')} · ${nj} at Joia` + (withHours >= 3 ? ` · ${openN} open now` : '');
    const groups = [['joia', 'At Iberostar Joia'], ['tierra', 'At Tierra del Sol'], ['partner', 'Partner restaurants']]
        .map(([a, t]) => ({ id: a, title: t, items: items.filter(F => F.area === a) }));
    const other = items.filter(F => !['joia', 'tierra', 'partner'].includes(F.area));
    if (other.length) groups.push({ id: 'other', title: 'More places to eat', items: other });
    let i = 0;
    const body = groups.filter(g => g.items.length).map(g => `<div class="group__head" data-group><h2 class="group__title">${esc(g.title)}</h2><span class="group__count">${g.items.length}</span></div>`
        + g.items.map(F => cardHTML(F, { eager: i++ < 2 })).join('')).join('');
    el.innerHTML = viewHead('dine', { eyebrow, title: 'Dine', lede: 'From Joia’s terraces to the island’s best tables.', extra: fieldHTML('dine', 'Search restaurants') })
        + chipbarHTML('dine', items, 'Filter restaurants')
        + `<div class="wrap"><p class="result-count" aria-live="polite" data-count></p><div class="results grid grid--dine" data-results>${body}</div><div data-empty></div><div data-xsec></div></div>`;
    syncFilterUI('dine');
}

/* Explore */
const exploreItems = () => facetsWhere(F => (F.item.type === 'fun' && visibleInMode(F.item, S.inHouse)) || F.item.type === 'golf' || F.item.type === 'store');
function renderExplore(el) {
    const items = exploreItems();
    const fun = items.filter(F => F.item.type === 'fun');
    const groups = [];
    if (S.inHouse) {
        const parts = [...new Set(fun.map(F => partnerShort(F.item) || 'Tours & activities'))];
        parts.forEach(p => groups.push({ title: p, items: fun.filter(F => (partnerShort(F.item) || 'Tours & activities') === p) }));
    } else {
        groups.push({ title: 'Sailing & snorkeling', items: fun.filter(F => F.tags.includes('water')) });
        groups.push({ title: 'Off-road & island tours', items: fun.filter(F => !F.tags.includes('water')) });
    }
    groups.push({ title: 'Golf & nature', items: items.filter(F => F.item.type === 'golf') });
    groups.push({ title: 'Shopping', items: items.filter(F => F.item.type === 'store') });
    let i = 0;
    const body = groups.filter(g => g.items.length).map(g => {
        const live = g.items.filter(F => F.status !== 'coming-soon'), soon = g.items.filter(F => F.status === 'coming-soon');
        return `<div class="group__head" data-group><h2 class="group__title">${esc(g.title)}</h2><span class="group__count">${live.length}</span></div>`
            + live.map(F => cardHTML(F, { variant: 'explore', eager: i++ < 2 })).join('')
            + soon.map(F => `<div class="cs-wrap" data-key="${esc(F.key)}">${csRowHTML(F)}</div>`).join('');
    }).join('');
    const nFun = fun.length;
    const head = S.inHouse
        ? { eyebrow: 'Red Sail Sports · On-site partner', title: 'Explore', lede: 'In-house partners' }
        : { eyebrow: `${plural(nFun, 'tour')} · Golf · Shopping`, title: 'Explore', lede: 'Tours, golf and island finds from our partners.', ledeOpt: true };
    head.extra = fieldHTML('explore', 'Search tours, golf, shops');
    el.innerHTML = viewHead('explore', head) + chipbarHTML('explore', items, 'Filter experiences')
        + `<div class="wrap"><p class="result-count" aria-live="polite" data-count></p><div class="results grid grid--explore" data-results>${body}</div><div data-empty></div><div data-xsec></div></div>`;
    syncFilterUI('explore');
}

/* Spa */
function renderSpa(el) {
    const items = facetsWhere(F => F.item.type === 'spa');
    const main = items.find(F => F.key === 'SpaMain') || items.find(F => !isComplimentary(F.item));
    const promo = items.find(F => F.key === 'SpaPromo') || items.find(F => isComplimentary(F.item) && F !== main);
    const rest = items.filter(F => F !== main && F !== promo);
    let body = '';
    if (main) body += featureHTML(main, { h: 2, eager: true, eyebrow: areaLabel(main.area) || 'Spa Sensations', meta: 'Treatments, rituals and a hydrotherapy circuit' });
    if (promo) body += `<article class="voucher" data-key="${esc(promo.key)}"><div class="voucher__main"><p class="eyebrow">Complimentary</p>`
        + `<h2 class="voucher__title"><a class="card__link" href="${itemHash(promo.key)}">${esc(cleanTitle(promo.item))}</a></h2>`
        + `<p class="voucher__meta">${esc([promo.dur.text, promo.area === 'joia' ? 'Spa Sensations at Joia' : ''].filter(Boolean).join(' · '))}</p></div>`
        + `<a class="btn btn--secondary" href="${itemHash(promo.key)}" tabindex="-1" aria-hidden="true">View</a></article>`;
    el.innerHTML = viewHead('spa', { title: 'Spa & Wellness', lede: 'Spa Sensations at Iberostar Joia' })
        + `<div class="wrap"><div class="spa-layout">${body}</div>${rest.length ? `<div class="group"><div class="list resorts-grid">${rest.map(F => featureHTML(F, { h: 2 })).join('')}</div></div>` : ''}</div>`;
}

/* Resorts */
function renderResorts(el) {
    const clubs = facetsWhere(F => F.item.type === 'club');
    const open = clubs.filter(F => F.status !== 'coming-soon'), soon = clubs.filter(F => F.status === 'coming-soon');
    el.innerHTML = viewHead('resorts', { eyebrow: 'Iberostar in Aruba', title: 'Our resorts', lede: 'Adults-only on Eagle Beach, and golf at Tierra del Sol.' })
        + `<div class="wrap"><div class="resorts-grid">${open.map((F, i) => featureHTML(F, { h: 2, eager: i < 2, eyebrow: F.item.sub, meta: F.item.video ? 'Video tour' : '', sizes: '(min-width:600px) 50vw, 100vw' })).join('')}</div>`
        + (soon.length ? `<div class="group"><div class="group__head"><h2 class="group__title">What’s next</h2></div><div class="cs-list">${soon.map(csRowHTML).join('')}</div></div>` : '') + `</div>`;
}

/* Saved (§B5.5): own list or a shared ?ids= list (banner, not merged until "Save all") */
const SAVED_GROUPS = [['Dine', t => t === 'food'], ['Explore', t => t === 'fun' || t === 'golf' || t === 'store'], ['Spa', t => t === 'spa'], ['Resorts', t => t === 'club']];
function renderSaved(el) {
    const shared = S.shared;
    const keys = shared || S.saved;
    let h = viewHead('saved', { title: 'Saved', lede: 'Your shortlist for this stay. Saved on this device only.' });
    h += '<div class="wrap">';
    if (shared) {
        h += `<div class="shared-banner"><p><b>Shared with you</b> · ${plural(shared.length, 'item')}</p><div class="shared-banner__actions">`
            + `<button type="button" class="btn btn--primary" data-action="shared-save-all">Save all</button><button type="button" class="btn--text" data-action="shared-dismiss">Dismiss</button></div></div>`;
    }
    if (!keys.length) {
        h += `<div class="empty empty--saved">${icon('heart')}<h2>Nothing saved yet</h2><p>Save restaurants and tours to plan your stay.</p><a class="btn btn--primary" href="#/today">${(S.info && /^(morning|day)$/.test(S.info.phase)) ? 'See today’s picks' : 'See tonight’s picks'}</a></div>`;
    } else {
        if (!shared) h += `<div class="saved-actions"><button type="button" class="btn btn--secondary" data-action="saved-share">${icon('share')}Share list</button><a class="btn btn--primary" href="#/saved/show">Show to concierge</a></div>`;
        SAVED_GROUPS.forEach(([title, t]) => {
            const fs = keys.map(k => facet(k)).filter(F => F && t(F.item.type));
            if (fs.length) h += `<section class="group" aria-labelledby="sg-${title}"><div class="group__head"><h2 class="group__title" id="sg-${title}">${title}</h2><span class="group__count">${fs.length}</span></div>`
                + `<div class="list">${fs.map(F => cardHTML(F, { variant: 'row' })).join('')}</div></section>`;
        });
    }
    el.innerHTML = h + '</div>';
}
async function shareSaved(btn) {
    const keys = S.saved;
    const url = location.origin + location.pathname + '#/saved?ids=' + keys.map(encodeURIComponent).join(',');
    const text = keys.map(k => '• ' + appData[k].title).join('\n');
    try { if (navigator.share) { await navigator.share({ title: 'Our Aruba plans', text, url }); return; } } catch (e) { if (e && e.name === 'AbortError') return; }
    const ok = await copyText(`Our Aruba plans\n${text}\n${url}`);
    toast(ok ? 'Link copied' : 'Could not copy the link');
}

const VIEW_RENDER = { today: renderToday, dine: renderDine, explore: renderExplore, spa: renderSpa, saved: renderSaved, resorts: renderResorts };

/* ---------- 11. Filters + inline search (Dine / Explore) ---------- */
const DINE_CHIPS = [
    { g: 'status', id: 'open', label: 'Open now', icon: 'clock', test: F => ['open', 'closing'].includes(openState(F.item).state), when: items => items.filter(F => F.hours.some(h => h.ok)).length >= 3 },
    { g: 'meal', id: 'breakfast', label: 'Breakfast', test: F => F.meals.includes('breakfast') },
    { g: 'meal', id: 'lunch', label: 'Lunch', test: F => F.meals.includes('lunch') },
    { g: 'meal', id: 'dinner', label: 'Dinner', test: F => F.meals.includes('dinner') },
    { g: 'meal', id: 'drinks', label: 'Drinks', test: F => F.meals.includes('drinks') },
    { g: 'loc', id: 'joia', label: 'At Joia', test: F => F.area === 'joia' },
    { g: 'loc', id: 'tierra', label: 'Tierra del Sol', test: F => F.area === 'tierra' },
    { g: 'loc', id: 'partner', label: 'Partner restaurants', test: F => F.area === 'partner' },
    { g: 'other', id: 'menu', label: 'Has menu', test: F => F.menus.length > 0 }
];
const tagChip = (g, id, label) => ({ g, id, label, test: F => F.tags.includes(id) });
const EXPLORE_CHIPS = [
    tagChip('kind', 'sunset', 'Sunset'), tagChip('kind', 'water', 'On the water'), tagChip('kind', 'snorkel', 'Snorkel'), tagChip('kind', 'offroad', 'Off-road'),
    tagChip('kind', 'island', 'Island tours'), tagChip('kind', 'private', 'Private charter'), tagChip('kind', 'golf', 'Golf & nature'), tagChip('kind', 'shop', 'Shopping'),
    tagChip('len', 'halfday', 'Half-day'), tagChip('len', 'fullday', 'Full-day'), tagChip('price', 'under100', 'Under $100'), tagChip('aud', 'kids', 'Kids')
];
function chipDefs(v, items) {
    if (v === 'explore') return EXPLORE_CHIPS;
    const counts = {};
    items.forEach(F => { if (F.cuisine) { const id = slugify(F.cuisine); counts[id] = counts[id] || { n: 0, label: F.cuisine }; counts[id].n++; } });
    const cuisines = Object.keys(counts).filter(id => counts[id].n >= 2 && !DINE_CHIPS.some(c => c.id === id))
        .map(id => ({ g: 'cuisine', id, label: counts[id].label, test: F => slugify(F.cuisine) === id }));
    const base = DINE_CHIPS.filter(c => !c.when || c.when(items));
    const i = base.findIndex(c => c.g === 'other');
    return base.slice(0, i).concat(cuisines, base.slice(i));
}
function chipbarHTML(v, items, label) {
    const defs = chipDefs(v, items);
    let prev = null, h = '';
    defs.forEach(c => {
        if (prev && prev !== c.g) h += '<span class="chip-sep" aria-hidden="true"></span>';
        prev = c.g;
        h += `<button type="button" class="chip" aria-pressed="false" data-action="chip" data-view="${v}" data-filter="${esc(c.id)}">${icon('check', 'chip__check')}${esc(c.label)}</button>`;
    });
    h += `<button type="button" class="chip chip--clear" data-action="clear-filters" data-view="${v}" hidden>Clear</button>`;
    return `<div class="chipbar" role="group" aria-label="${esc(label)}" data-chips="${v}">${h}</div>`;
}
/* Pure: which items match the view's chips (OR within a group, AND across) and query. */
function filterItems(v, items, active, q, skipGroup) {
    const defs = chipDefs(v, items);
    const groups = {};
    active.forEach(id => { const c = defs.find(x => x.id === id); if (c && c.g !== skipGroup) (groups[c.g] = groups[c.g] || []).push(c); });
    let res = items.filter(F => Object.values(groups).every(cs => cs.some(c => c.test(F))));
    if (q && queryTokens(q).length) {
        const hits = searchItems(q, { inHouse: S.inHouse, keys: res.map(F => F.key) });
        res = hits.map(h => facet(h.key));
    }
    return res;
}
function syncFilterUI(v) {
    const el = viewEl(v);
    if (!el.firstElementChild) return;
    const items = v === 'dine' ? dineItems() : exploreItems();
    const st = S.filt[v];
    const defs = chipDefs(v, items);
    [...st.f].forEach(id => { if (!defs.some(c => c.id === id)) st.f.delete(id); });
    const filtering = st.f.size > 0 || queryTokens(st.q).length > 0;
    const res = filterItems(v, items, st.f, st.q);
    const rank = new Map(res.map((F, i) => [F.key, i]));
    if (filtering && !st.q) { // flat list: on-property first, then data order
        const sorted = res.slice().sort((a, b) => (b.onProperty - a.onProperty) || byOrder(a, b));
        sorted.forEach((F, i) => rank.set(F.key, i));
    }
    const box = $('[data-results]', el);
    $$('[data-group]', box).forEach(g => { g.hidden = filtering; });
    $$('[data-key]', box).forEach(c => {
        const r = rank.get(c.dataset.key);
        c.hidden = filtering && r == null;
        if (filtering && r != null) c.style.setProperty('--o', r); else c.style.removeProperty('--o');
    });
    box.classList.toggle('is-filtered', filtering);
    // chips: hide zero-result chips (unless active), set pressed state
    $$('[data-action="chip"]', el).forEach(b => {
        const id = b.dataset.filter, c = defs.find(x => x.id === id), on = st.f.has(id);
        b.setAttribute('aria-pressed', String(on));
        if (!on && c) {
            const trial = new Set([...st.f].filter(x => (defs.find(d => d.id === x) || {}).g !== c.g));
            trial.add(id);
            b.hidden = filterItems(v, items, trial, st.q).length === 0;
        } else b.hidden = false;
    });
    $$('.chip-sep', el).forEach(s => {
        let p = s.previousElementSibling; while (p && p.hidden) p = p.previousElementSibling;
        s.hidden = !p || p.classList.contains('chip-sep');
    });
    $('[data-action="clear-filters"]', el).hidden = !(st.f.size || st.q);
    const noun = v === 'dine' ? ['restaurant', 'restaurants'] : ['experience', 'experiences'];
    $('[data-count]', el).textContent = filtering ? plural(res.length, noun[0], noun[1]) : '';
    const input = $('[data-inline-search]', el);
    if (input && input.value !== st.q && document.activeElement !== input) input.value = st.q;
    $('[data-action="field-clear"]', el).hidden = !st.q;
    // empty state + cross-section footer
    const empty = $('[data-empty]', el), xsec = $('[data-xsec]', el);
    empty.innerHTML = filtering && !res.length ? emptyHTML(v, st.q) : '';
    xsec.innerHTML = '';
    if (st.q && queryTokens(st.q).length) {
        const mine = new Set(items.map(F => F.key));
        const others = searchItems(st.q, { inHouse: S.inHouse }).filter(h => !mine.has(h.key));
        if (others.length) {
            const where = others.map(h => facet(h.key).item.type).map(t => PARENT_BY_TYPE[t]).filter((x, i, a) => a.indexOf(x) === i);
            const label = where.length === 1 ? VIEW_TITLE[where[0]].replace('Spa & Wellness', 'Spa').replace('Our resorts', 'Resorts') : 'other sections';
            xsec.innerHTML = `<a class="xsec" href="#/search?q=${encodeURIComponent(st.q)}">${plural(others.length, 'more match', 'more matches')} in ${esc(label)}${icon('arrow-right')}</a>`;
        }
    }
    sweepImages(box);
}
function emptyHTML(v, q) {
    let sugg = '';
    if (q) {
        const all = searchItems(q, { inHouse: S.inHouse }).slice(0, 3).map(h => facet(h.key));
        if (all.length) sugg = `<p>Try ${all.map(F => `<a class="btn--text" href="${itemHash(F.key)}">${esc(cleanTitle(F.item))}</a>`).join(', ')}.</p>`;
    }
    const title = q ? `No matches for “${esc(q)}”` : 'No matches for these filters';
    return `<div class="empty">${icon('search')}<h3>${title}</h3>${sugg || '<p>Try fewer filters.</p>'}<button type="button" class="btn btn--secondary" data-action="clear-filters" data-view="${v}">Clear filters</button></div>`;
}
function commitFilters(v) {
    const h = viewHash(v);
    S.tabHref[v] = h;
    if (S.view === v && !Overlay.stack.length) history.replaceState(Object.assign({}, history.state || { ib: 1, idx: 0 }), '', h);
    if (S.route && S.view === v) { S.route.f = [...S.filt[v].f]; S.route.q = S.filt[v].q; }
    lastRendered = location.hash;
    updateTabs(S.view);
    syncFilterUI(v);
}
/* Kept global: re-applies the chips and query of the current view. */
function filterContent() { if (S.view === 'dine' || S.view === 'explore') syncFilterUI(S.view); }
let inlineT = 0;
function onInlineInput(input) {
    const v = input.dataset.inlineSearch;
    clearTimeout(inlineT);
    inlineT = setTimeout(() => { S.filt[v].q = input.value.trim() ? input.value : ''; commitFilters(v); }, 80);
}

/* ---------- 12. Overlays ---------- */
const OV_RENDER = {};

/* 12a. Detail sheet (§B5.8) */
let dheroIO = null, slideIO = null;
OV_RENDER.detail = (ov, el) => { resetSheetDrag(el); renderDetail(ov.key, el); return { after: () => wireDetail(el) }; };
function renderDetail(key, el) {
    const F = facet(key), it = F.item, K = F.key;
    S.detailKey = K;
    el.classList.remove('scrolled');
    el.setAttribute('aria-labelledby', 'dTitle');
    $('.sheet__toptitle', el).textContent = cleanTitle(it);
    $$('[data-action="save"]', el).forEach(b => { b.dataset.key = K; b.setAttribute('aria-pressed', String(isSaved(K))); b.setAttribute('aria-label', 'Save ' + cleanTitle(it)); });
    // Hero: paint the new item's LQIP/dominant colour first (stale-hero fix), then slides.
    const dh = $('.dhero', el), g = it.gallery, m0 = mediaOf(g[0]);
    dh.innerHTML = '';
    dh.classList.remove('is-slow');
    dh.style.setProperty('--lqip', m0 && m0.q ? `url('${m0.q}')` : 'none');
    dh.style.setProperty('--dom', m0 && m0.c ? m0.c : '');
    if (!g.length) dh.innerHTML = phHTML(phSpecFor(F));
    else {
        const sizes = isLg() ? '(min-width:1200px) 605px, 55vw' : isLandPhone() ? '45vw' : '(min-width:600px) 720px, 100vw';
        dh.innerHTML = `<div class="dhero__track">${g.map((src, i) => `<button type="button" class="dhero__slide" data-action="photo" data-n="${i + 1}" aria-label="Open photo ${i + 1} of ${g.length}">`
            + `<div class="media"${mediaAttrs(src)}${phData(F)}>${imgHTML(src, { widths: [800, 1600], sizes, eager: i === 0, priority: i === 0, alt: '', lazySrc: i > 1 })}</div></button>`).join('')}</div>`
            + (g.length > 1 ? `<span class="dhero__count" aria-hidden="true">1 / ${g.length}</span>`
                + `<button type="button" class="icon-btn on-photo dhero__arrow dhero__arrow--prev" data-action="hero-prev" aria-label="Previous photo">${icon('chevron-left')}</button>`
                + `<button type="button" class="icon-btn on-photo dhero__arrow dhero__arrow--next" data-action="hero-next" aria-label="Next photo">${icon('chevron-right')}</button>` : '')
            + `<div class="spinner" aria-hidden="true"></div>`;
        clearTimeout(dh._slowT);
        dh._slowT = setTimeout(() => { const im = $('img', dh); if (im && !im.classList.contains('is-loaded') && S.detailKey === K) dh.classList.add('is-slow'); }, 400);
    }
    $('.dbody', el).innerHTML = detailBodyHTML(F);
    $('.sheet__actions', el).innerHTML = actionsHTML(F);
    $('.sheet__scroll', el).scrollTop = 0;
    $('.dbody', el).scrollTop = 0;
    sweepImages(el);
    syncNet();
}
function eyebrowFor(F) {
    const it = F.item;
    if (F.status === 'coming-soon') return statusLabel(it);
    if (it.type === 'food') return [areaLabel(F.area), F.cuisine].filter(Boolean).join(' · ');
    if (it.type === 'fun') return partnerShort(it) + ' · ' + funCategory(F);
    return it.sub;
}
function storyHTML(F) {
    const html = F.descHtml.trim();
    if (!html) return '';
    if (!/<[a-z!/]/i.test(html)) {
        const text = decodeEntities(html).replace(/\s+/g, ' ').trim();
        const m = /^(.{12,}?[.!?])\s+(?=[A-Z0-9“"'(])/.exec(text);
        const first = m ? m[1] : text, rest = m ? text.slice(m[0].length) : '';
        return `<section class="dsec story" aria-label="About"><p class="standfirst">${esc(first)}</p>${rest ? `<div class="prose"><p>${esc(rest)}</p></div>` : ''}</section>`;
    }
    return `<section class="dsec story" aria-label="About"><div class="prose">${html}</div></section>`;
}
function pricesHTML(F) {
    const rows = F.rows;
    if (!rows.length) return '';
    const isAdd = r => /^add-on/i.test(r.label);
    const main = rows.filter(r => !isAdd(r)), adds = rows.filter(isAdd);
    const li = (r, hide) => `<li class="price-line"${hide ? ' hidden data-more' : ''}><span>${esc(r.label.replace(/^add-on:\s*/i, ''))}</span><strong>${esc(r.value != null ? fmtPrice(r.value) : r.text)}</strong></li>`;
    return `<section class="dsec prices" aria-labelledby="pricesH"><h3 id="pricesH">Prices</h3><ul>${main.map((r, i) => li(r, i >= 5)).join('')}</ul>`
        + (main.length > 5 ? `<button type="button" class="btn--text" aria-expanded="false" data-action="prices-more">Show all ${main.length} options</button>` : '')
        + (adds.length ? `<h4>Add-ons</h4><ul>${adds.map(r => li(r)).join('')}</ul>` : '') + `</section>`;
}
function routeHTML(F) {
    const it = F.item;
    if (!it.itinerary.length) return '';
    return `<section class="dsec" aria-labelledby="routeH"><h3 id="routeH">${it.type === 'fun' ? 'The route' : 'Highlights'}</h3><ol class="route">`
        + it.itinerary.map((s, i) => `<li data-n="${String(i + 1).padStart(2, '0')}"><span>${esc(s).replace(/(\([^)]*\))/g, '<span class="aside">$1</span>')}</span></li>`).join('') + `</ol></section>`;
}
const ESS_ICON = { bring: 'bag', included: 'check', addons: 'plus', info: 'info' };
function essentialsHTML(F) {
    const it = F.item;
    if (!it.essentials.length) return '';
    const groups = {};
    it.essentials.forEach(s => { const g = classifyEssential(s); (groups[g] = groups[g] || []).push(s); });
    return `<section class="dsec essentials" aria-labelledby="essH"><h3 id="essH">Before you go</h3>` + ESSENTIAL_GROUPS.filter(g => groups[g]).map(g =>
        `<div class="egroup"><h4>${esc(essentialGroupTitle(g, it))}</h4><ul class="checklist">${groups[g].map(s => `<li class="ck--${g}">${icon(ESS_ICON[g])}<span>${esc(s)}</span></li>`).join('')}</ul></div>`).join('') + `</section>`;
}
function fmtBytes(b) { return b >= 1048576 ? (b / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB'; }
function pdfMeta(url) {
    const p = HAS_MEDIA && MEDIA.pdf && MEDIA.pdf[url];
    return p ? ['PDF', p.pages ? plural(p.pages, 'page') : '', p.bytes ? fmtBytes(p.bytes) : ''].filter(Boolean).join(' · ') : 'PDF';
}
function menuHref(F, i) { return encodePath(F.menus[i].url); }
function menuRowsHTML(F) {
    return F.menus.map((p, i) => `<a class="menu-row" href="${menuHref(F, i)}" target="_blank" rel="noopener" data-action="menu" data-key="${esc(F.key)}" data-i="${i}">`
        + `<span class="menu-row__icon">${icon('doc')}</span><span><span class="menu-row__label">${esc(p.label)}</span><span class="menu-row__meta">${esc(pdfMeta(p.url))}</span></span>${icon('external')}</a>`).join('');
}
function videoInfo(it) {
    const v = HAS_MEDIA && MEDIA.video && MEDIA.video[it.video];
    const d = v && v.dur ? `${Math.floor(v.dur / 60)}:${String(Math.round(v.dur % 60)).padStart(2, '0')}` : '';
    return { poster: v && v.poster ? v.poster : '', dur: d };
}
function detailBodyHTML(F) {
    const it = F.item, K = F.key;
    let h = '';
    if (it.logo && it.gallery.length) h += `<div class="dlogo">${logoImgHTML(it.logo, { alt: cleanTitle(it) + ' logo', box: [192, 36], eager: true })}</div>`;
    const eb = eyebrowFor(F);
    if (eb) h += `<p class="eyebrow">${esc(eb)}</p>`;
    h += `<h2 class="dtitle" id="dTitle" tabindex="-1">${esc(cleanTitle(it))}</h2>`;
    if (it.type === 'food' && F.hours.some(x => x.ok)) { const st = openState(it); h += `<p class="status status--${st.state}" data-status-key="${esc(K)}">${esc(st.text)}</p>`; }
    const facts = factsOf(F);
    if (facts.length) h += `<dl class="facts">${facts.map(f => `<div><dt>${esc(f.dt)}</dt><dd>${esc(f.dd)}</dd></div>`).join('')}</dl>`;
    if (F.slots.length > 1) h += `<div class="slots" role="group" aria-label="Departure options">${F.slots.map(s => `<span class="slot">${s.label ? `<b>${esc(s.label)}</b>` : ''}${esc(s.short || s.value)}${s.note ? ` · ${esc(s.note)}` : ''}</span>`).join('')}</div>`;
    if (it.bookingNote) h += `<p class="booking-note">${esc(it.bookingNote)}</p>`;
    const unparsed = F.hours.filter(x => !x.ok);
    if (unparsed.length) h += `<p class="booking-note">${unparsed.map(x => esc(x.raw)).join('<br>')}</p>`;
    h += pricesHTML(F) + storyHTML(F) + routeHTML(F) + essentialsHTML(F);
    if (F.menus.length) h += `<section class="dsec menus" aria-labelledby="menusH"><h3 id="menusH">${it.type === 'food' ? 'Menus' : 'Brochure'}</h3><div>${menuRowsHTML(F)}</div></section>`;
    if (it.video) {
        const vi = videoInfo(it);
        const cap = ['Video tour', vi.dur, 'Best on Wi-Fi'].filter(Boolean).join(' · ');
        h += `<section class="dsec" aria-labelledby="videoH"><h3 id="videoH">Video tour</h3><a class="video-row" href="${itemHash(K, '/video')}" data-needs-net aria-label="Play video tour${vi.dur ? ', ' + vi.dur : ''}">`
            + (vi.poster ? `<div class="media"${mediaAttrs(vi.poster)}><img src="${encodePath(vi.poster)}" alt="" loading="lazy" decoding="async"></div>` : mediaBox(F, { src: it.gallery[1] || it.gallery[0], widths: [800], sizes: '(min-width:1024px) 420px, 100vw' }))
            + `<span class="video-row__play">${icon('play')}</span>${vi.dur ? `<span class="video-row__dur">${esc(vi.dur)}</span>` : ''}</a>`
            + `<p class="video-cap" data-net-cap="${esc(cap)}">${esc(cap)}</p></section>`;
    }
    h += contactHTML(it);
    const g = it.gallery;
    if (g.length >= 3) {
        const tiles = g.slice(1, 10);
        h += `<section class="dsec" aria-labelledby="photosH"><h3 id="photosH">Photos · ${g.length}</h3><div class="photos-grid">`
            + tiles.map((src, i) => {
                const n = i + 2, last = i === tiles.length - 1 && g.length > 10;
                return `<button type="button" data-action="photo" data-n="${last ? 1 : n}" aria-label="${last ? `See all ${g.length} photos` : `Open photo ${n} of ${g.length}`}">`
                    + `<div class="media"${mediaAttrs(src)}>${imgHTML(src, { widths: [480], sizes: '(min-width:1024px) 150px, 33vw', alt: '', lazySrc: true })}</div>${last ? `<span class="more">See all ${g.length}</span>` : ''}</button>`;
            }).join('') + `</div></section>`;
    }
    const foot = [];
    if (it.type === 'fun' && F.partner) foot.push(`<li>${it.partnerLogo ? `<span class="dfoot__logo">${logoImgHTML(it.partnerLogo, { box: [26, 26] })}</span>` : `<span class="dfoot__ic">${icon('sail')}</span>`}<span>Operated by ${esc(F.partner)}</span></li>`);
    if (F.iberocash) foot.push(`<li><span class="dfoot__ic">${icon('check')}</span><span>IberoCash accepted</span>${IBEROCASH_NOTE ? `<button type="button" class="icon-btn dfoot__info" data-action="iberocash" aria-label="About IberoCash">${icon('info')}</button>` : ''}</li>`);
    if (foot.length) h += `<div class="dfoot"><ul>${foot.join('')}</ul></div>`;
    return h + `<div class="dspacer" aria-hidden="true"></div>`;
}
function contactHTML(it) {
    const rows = [];
    if (it.phone) rows.push(`<a class="menu-row" href="tel:${esc(it.phone.replace(/[^\d+]/g, ''))}"><span class="menu-row__icon">${icon('info')}</span><span><span class="menu-row__label">Call</span><span class="menu-row__meta">${esc(it.phone)}</span></span>${icon('chevron-right')}</a>`);
    if (it.whatsapp) rows.push(`<a class="menu-row" href="https://wa.me/${esc(it.whatsapp.replace(/\D/g, ''))}" target="_blank" rel="noopener"><span class="menu-row__icon">${icon('external')}</span><span><span class="menu-row__label">WhatsApp</span></span>${icon('external')}</a>`);
    if (it.email) rows.push(`<a class="menu-row" href="mailto:${esc(it.email)}"><span class="menu-row__icon">${icon('info')}</span><span><span class="menu-row__label">Email</span><span class="menu-row__meta">${esc(it.email)}</span></span>${icon('chevron-right')}</a>`);
    if (it.address) {
        const apple = document.documentElement.classList.contains('device-ios') || /Mac/.test(navigator.platform || '');
        const url = (apple ? 'https://maps.apple.com/?q=' : 'https://www.google.com/maps/search/?api=1&query=') + encodeURIComponent(it.address);
        rows.push(`<a class="menu-row" href="${url}" target="_blank" rel="noopener"><span class="menu-row__icon">${icon('pin')}</span><span><span class="menu-row__label">Directions</span><span class="menu-row__meta">${esc(it.address)}</span></span>${icon('external')}</a>`);
    }
    return rows.length ? `<section class="dsec" aria-labelledby="contactH"><h3 id="contactH">Contact</h3><div>${rows.join('')}</div></section>` : '';
}
/* Primary CTA (first match wins, §B5.8 table) */
function ctaFor(F) {
    const it = F.item, t = it.type, K = F.key;
    if (it.bookUrl && /^https?:/i.test(it.bookUrl)) return { label: 'Book online', href: it.bookUrl, ext: true, icon: 'external' };
    const wa = (it.whatsapp || '').replace(/\D/g, '');
    if (wa) return { label: 'Reserve on WhatsApp', href: `https://wa.me/${wa}?text=` + encodeURIComponent(`Hi! I'm a guest at Iberostar Aruba. I'd like to reserve ${it.title}.`), ext: true };
    if (it.phone) return { label: 'Call to reserve', href: 'tel:' + it.phone.replace(/[^\d+]/g, '') };
    if (F.status === 'coming-soon' || t === 'store') return null;
    if (t === 'food') {
        if (F.menus.length === 1) return { label: 'View menu', href: menuHref(F, 0), ext: true, icon: 'doc', menu: 0 };
        if (F.menus.length > 1) return { label: `Menus (${F.menus.length})`, href: itemHash(K, '/menu'), icon: 'doc' };
        return { label: 'Ask the concierge', href: itemHash(K, '/request') };
    }
    if (t === 'fun' || t === 'spa' || t === 'golf') return { label: 'Request with concierge', href: itemHash(K, '/request') };
    if (t === 'club' && it.video) return { label: 'Watch the film', href: itemHash(K, '/video'), icon: 'play', video: true };
    return null;
}
function actionsHTML(F) {
    const it = F.item, K = F.key, c = ctaFor(F);
    const on = isSaved(K);
    const saveIcon = `${icon('heart', 'ic--off')}${icon('heart-fill', 'ic--on')}`;
    if (!c) {
        return `<button type="button" class="btn btn--secondary is-wide" data-action="save" data-key="${esc(K)}" aria-pressed="${on}" aria-label="Save ${esc(cleanTitle(it))}">${saveIcon}<span>Save</span></button>`
            + `<button type="button" class="btn btn--secondary is-wide" data-action="share" data-key="${esc(K)}">${icon('share')}<span>Share</span></button>`;
    }
    let h = `<a class="btn btn--primary" href="${c.href}"${c.ext ? ' target="_blank" rel="noopener"' : ''}${c.menu != null ? ` data-action="menu" data-key="${esc(K)}" data-i="${c.menu}"` : ''}${c.video ? ' data-needs-net' : ''}>${c.icon ? icon(c.icon) : ''}<span>${esc(c.label)}</span></a>`;
    if (it.type === 'food' && F.menus.length && !it.bookUrl && !it.whatsapp && !it.phone && window.innerWidth >= 375) h += `<a class="btn btn--secondary" href="${itemHash(K, '/request')}">Reserve</a>`;
    if (it.video && !c.video) h += `<a class="icon-btn icon-btn--lg" href="${itemHash(K, '/video')}" aria-label="Watch the video tour" data-needs-net>${icon('play')}</a>`;
    h += `<button type="button" class="icon-btn icon-btn--lg" data-action="save" data-key="${esc(K)}" aria-pressed="${on}" aria-label="Save ${esc(cleanTitle(it))}">${saveIcon}</button>`;
    h += `<button type="button" class="icon-btn icon-btn--lg" data-action="share" data-key="${esc(K)}" aria-label="Share">${icon('share')}</button>`;
    return h;
}
function wireDetail(el) {
    const two = twoPane();
    const scroller = two ? $('.dbody', el) : $('.sheet__scroll', el);
    const dh = $('.dhero', el);
    const body = $('.dbody', el); // its own scroller in two-pane layouts → must be keyboard-scrollable
    if (two) { body.tabIndex = 0; body.setAttribute('role', 'region'); body.setAttribute('aria-label', 'Details'); }
    else { body.removeAttribute('tabindex'); body.removeAttribute('role'); body.removeAttribute('aria-label'); }
    if (dheroIO) dheroIO.disconnect();
    if (slideIO) slideIO.disconnect();
    el.classList.remove('scrolled');
    if ('IntersectionObserver' in window && !two) {
        dheroIO = new IntersectionObserver(es => el.classList.toggle('scrolled', !es[es.length - 1].isIntersecting), { root: scroller, threshold: 0, rootMargin: '-52px 0px 0px 0px' });
        dheroIO.observe(dh);
    }
    const track = $('.dhero__track', dh);
    if (track && 'IntersectionObserver' in window) {
        const slides = $$('.dhero__slide', track);
        const count = $('.dhero__count', dh);
        slideIO = new IntersectionObserver(es => es.forEach(e => {
            if (!e.isIntersecting) return;
            const i = slides.indexOf(e.target);
            if (count) count.textContent = `${i + 1} / ${slides.length}`;
            [i - 1, i, i + 1].forEach(j => slides[j] && loadLazyImg($('img', slides[j])));
            dh.dataset.cur = String(i);
            const p = $('[data-action="hero-prev"]', dh), n = $('[data-action="hero-next"]', dh);
            if (p) p.disabled = i === 0;
            if (n) n.disabled = i === slides.length - 1;
        }), { root: track, threshold: 0.6 });
        slides.forEach(s => slideIO.observe(s));
    }
}
function loadLazyImg(img) {
    if (!img || !img.dataset.src) return;
    if (img.dataset.srcset) { img.srcset = img.dataset.srcset; delete img.dataset.srcset; }
    if (img.dataset.sizes) { img.sizes = img.dataset.sizes; delete img.dataset.sizes; }
    img.src = img.dataset.src;
    delete img.dataset.src;
}
function heroTo(i, instant) {
    const dh = $('#ovDetail .dhero'), track = dh && $('.dhero__track', dh);
    if (!track) return;
    const n = track.children.length;
    i = Math.max(0, Math.min(n - 1, i));
    const s = track.children[i];
    if (s) loadLazyImg($('img', s));
    track.scrollTo({ left: i * track.clientWidth, behavior: instant || reduceMotion() ? 'auto' : 'smooth' });
}
function heroStep(dir) {
    const dh = $('#ovDetail .dhero');
    if (dh) heroTo((parseInt(dh.dataset.cur || '0', 10)) + dir);
}
/* Drag-to-dismiss (phone bottom sheet, §B5.8). Engages only when the sheet is scrolled to the
   top and the first 10px of movement are mostly downward; horizontal movement stays with the
   hero carousel. The panel follows 1:1 (×0.5 rubber-band upward), the scrim fades, and the hero
   photo stretches. Touch input uses touch events: iOS fires pointercancel as soon as its native
   pan starts inside the scroller, which would kill a pointer-based drag mid-gesture. A mouse uses
   pointer events (desktop browsers at phone/tablet widths). */
function initSheetDrag(el) {
    const panel = $('.sheet__panel', el), scroller = $('.sheet__scroll', el), scrim = $('.sheet__scrim', el);
    let g = null, suppressClick = false;
    const heroImg = () => {
        const dh = $('.dhero', el), i = parseInt(dh.dataset.cur || '0', 10);
        return $$('.dhero__slide .media', dh)[i] || $('.ph', dh);
    };
    const start = (x, y, t) => {
        g = null;
        if (twoPane() || scroller.scrollTop > 0 || !el.classList.contains('is-open') || Overlay.top()?.el !== el) return;
        g = { sx: x, sy: y, ly: y, lt: t, vel: 0, dy: 0, lock: '' };
    };
    const move = (x, y, t) => {
        if (!g) return false;
        const dx = x - g.sx, d = y - g.sy;
        if (!g.lock) {
            if (Math.abs(dx) < 10 && Math.abs(d) < 10) return false;
            g.lock = Math.abs(d) > Math.abs(dx) && d > 0 && scroller.scrollTop <= 0 ? 'y' : 'x';
            if (g.lock !== 'y') { g = null; return false; }
            g.sy = y; // start following from here so the sheet does not jump by the 10px slop
            panel.classList.add('is-dragging');
            g.hero = heroImg();
        }
        const dd = y - g.sy;
        g.dy = dd > 0 ? dd : dd * 0.5;
        const dt = t - g.lt;
        if (dt > 0) g.vel = 0.8 * ((y - g.ly) / dt) + 0.2 * g.vel;
        g.ly = y; g.lt = t;
        panel.style.transform = `translate3d(0,${g.dy}px,0)`;
        scrim.style.opacity = String(Math.max(0, 1 - Math.max(0, g.dy) / 600));
        if (g.hero && !reduceMotion()) g.hero.style.transform = g.dy > 0 ? `scale(${1 + g.dy / 400})` : '';
        return true;
    };
    const end = () => {
        const G = g; g = null;
        if (!G || G.lock !== 'y') return;
        suppressClick = true; setTimeout(() => { suppressClick = false; }, 0);
        panel.classList.remove('is-dragging');
        if (G.hero) G.hero.style.transform = '';
        if (G.dy > 120 || G.vel > 0.6) {
            // finish the throw from where the finger left it, then let the router close the overlay
            panel.style.transition = 'transform var(--d-3) var(--ease-in)';
            panel.style.transform = 'translate3d(0,100%,0)';
            scrim.style.transition = 'opacity var(--d-3) var(--ease-in)';
            scrim.style.opacity = '0';
            closeTop();
        } else {
            panel.style.transition = 'transform var(--d-3) var(--ease-sheet)';
            panel.style.transform = '';
            scrim.style.opacity = '';
            setTimeout(() => { if (!panel.classList.contains('is-dragging')) panel.style.transition = ''; }, 300);
        }
    };
    panel.addEventListener('touchstart', e => { if (e.touches.length === 1) start(e.touches[0].clientX, e.touches[0].clientY, e.timeStamp); else g = null; }, { passive: true });
    panel.addEventListener('touchmove', e => { if (g && move(e.touches[0].clientX, e.touches[0].clientY, e.timeStamp)) e.preventDefault(); }, { passive: false });
    panel.addEventListener('touchend', end);
    panel.addEventListener('touchcancel', end);
    panel.addEventListener('pointerdown', e => {
        if (e.pointerType !== 'mouse' || e.button !== 0 || e.target.closest('input,textarea,select')) return;
        start(e.clientX, e.clientY, e.timeStamp);
        if (!g) return;
        const mv = ev => { if (move(ev.clientX, ev.clientY, ev.timeStamp)) { ev.preventDefault(); const sel = window.getSelection && getSelection(); if (sel) sel.removeAllRanges(); } };
        const up = () => { window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up); end(); };
        window.addEventListener('pointermove', mv);
        window.addEventListener('pointerup', up);
        window.addEventListener('pointercancel', up);
    });
    panel.addEventListener('click', e => { if (suppressClick) { e.preventDefault(); e.stopPropagation(); suppressClick = false; } }, true);
}
/* Clears inline drag styles before the sheet opens again. */
function resetSheetDrag(el) {
    const panel = $('.sheet__panel', el), scrim = $('.sheet__scrim', el);
    panel.classList.remove('is-dragging');
    panel.style.transform = ''; panel.style.transition = '';
    scrim.style.opacity = ''; scrim.style.transition = '';
}

/* 12b. Search overlay (§B5.7). Global search over every section. The query lives in the URL
   (#/search?q=, replaceState while typing), so a result pushed on top keeps search underneath
   and Back returns to the same results. */
const searchState = { q: '', t: 0, showAll: new Set() };
const RECENT_KEY = 'ib_recent_q';
const TRY_CHIPS = [['Dinner', 'dine'], ['Sunset', 'today'], ['Snorkel', 'sail'], ['Massage', 'spa'], ['Italian', 'dine'], ['Kids', 'star'], ['Golf', 'flag'], ['Shopping', 'bag']];
const SEARCH_GROUPS = [['Dine', t => t === 'food'], ['Explore', t => t === 'fun' || t === 'golf' || t === 'store'], ['Spa', t => t === 'spa'], ['Resorts', t => t === 'club']];
const BROWSE = [['Dine', '#/dine', 'dine', 'Restaurants, bars and menus'], ['Explore', '#/explore', 'explore', 'Tours, golf and shopping'], ['Spa', '#/spa', 'spa', 'Spa Sensations at Joia'], ['Our resorts', '#/resorts', 'star', 'Joia, Tierra del Sol and more']];
OV_RENDER.search = (ov, el) => {
    const q = (S.route && S.route.q) || parseRoute(location.hash).q || '';
    searchState.q = q; searchState.showAll.clear();
    el.innerHTML = `<div class="search__scrim" data-action="close" aria-hidden="true"></div><div class="search__panel"><div class="search__bar"><div class="field" role="search">${icon('search', 'field__icon')}`
        + `<input id="searchInput" class="field__input" type="search" enterkeyhint="search" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" aria-label="Search dining, tours and spa" aria-controls="searchResults" placeholder="Search the guide" data-autofocus>`
        + `<button type="button" class="field__clear" data-action="search-clear" aria-label="Clear search" hidden>${icon('close')}</button></div>`
        + `<button type="button" class="btn--text search__cancel" data-action="close">Cancel</button></div>`
        + `<div class="search__body"><p class="search__count" aria-live="polite" data-search-count></p><div id="searchResults" data-search-results></div></div></div>`;
    const input = $('#searchInput', el);
    input.value = q;
    $('[data-action="search-clear"]', el).hidden = !q;
    renderSearchResults(el);
    return { focusNow: input }; // synchronous focus inside the tap so iOS raises the keyboard
};
const tryChipsHTML = () => TRY_CHIPS.map(([c, ic]) => `<button type="button" class="chip" data-action="search-q" data-q="${esc(c.toLowerCase())}">${icon(ic)}${esc(c)}</button>`).join('');
function renderSearchResults(el) {
    el = el || $('#ovSearch');
    if (!el || !el.firstElementChild) return;
    const q = searchState.q, box = $('[data-search-results]', el), live = $('[data-search-count]', el);
    $('[data-action="search-clear"]', el).hidden = !q;
    $('.search__body', el).scrollTop = 0;
    if (!queryTokens(q).length) {
        const recent = store.json(RECENT_KEY, []).filter(x => typeof x === 'string').slice(0, 5);
        box.innerHTML = (recent.length ? `<section class="search__group" aria-labelledby="sgRecent"><div class="search__head"><h2 class="eyebrow" id="sgRecent">Recent</h2><button type="button" class="btn--text" data-action="recent-clear">Clear</button></div>`
            + `<ul class="search__recent">${recent.map(r => `<li><button type="button" data-action="search-q" data-q="${esc(r)}">${icon('clock')}<span>${esc(r)}</span>${icon('arrow-right', 'search__go')}</button></li>`).join('')}</ul></section>` : '')
            + `<section class="search__group" aria-labelledby="sgTry"><div class="search__head"><h2 class="eyebrow" id="sgTry">Try</h2></div><div class="search__chips">${tryChipsHTML()}</div></section>`
            + `<section class="search__group" aria-labelledby="sgBrowse"><div class="search__head"><h2 class="eyebrow" id="sgBrowse">Browse</h2></div><ul class="search__browse">`
            + BROWSE.map(([t, h, ic, sub]) => `<li><a href="${h}"><span class="search__bic">${icon(ic)}</span><span><b>${esc(t)}</b><span>${esc(sub)}</span></span>${icon('chevron-right', 'search__go')}</a></li>`).join('') + `</ul></section>`;
        live.textContent = '';
        live.hidden = true;
        return;
    }
    const hits = searchItems(q, { inHouse: S.inHouse });
    live.hidden = false;
    live.textContent = hits.length ? `${plural(hits.length, 'result')} for “${q.trim()}”` : 'No results';
    if (!hits.length) {
        box.innerHTML = `<div class="empty empty--search">${icon('search')}<h3>No matches for “${esc(q.trim())}”</h3><p>Check the spelling, or try one of these.</p><div class="search__chips">${tryChipsHTML()}</div></div>`;
        return;
    }
    box.innerHTML = SEARCH_GROUPS.map(([title, t]) => {
        const fs = hits.map(h => facet(h.key)).filter(F => t(F.item.type));
        if (!fs.length) return '';
        const all = searchState.showAll.has(title), id = 'sg' + title.replace(/\W/g, '');
        return `<section class="search__group" aria-labelledby="${id}"><div class="search__head"><h2 class="eyebrow" id="${id}">${title}</h2><span class="group__count">${fs.length}</span></div>`
            + `<div class="search__rows">${(all ? fs : fs.slice(0, 8)).map(F => searchRowHTML(F, q)).join('')}</div>`
            + (!all && fs.length > 8 ? `<button type="button" class="btn--text" data-action="search-all" data-group="${title}">Show all ${fs.length}${icon('chevron-down')}</button>` : '') + `</section>`;
    }).join('');
    sweepImages(box);
}
/* Applies a query now: URL (replace), state, results. */
function setSearchQuery(v) {
    searchState.q = v;
    searchState.showAll.clear();
    const t = v.trim();
    const h = '#/search' + (t ? '?q=' + encodeURIComponent(t) : '');
    if (location.hash !== h) history.replaceState(Object.assign({}, history.state), '', h);
    if (S.route) S.route.q = v;
    lastRendered = location.hash;
    renderSearchResults();
}
function onSearchInput(input) {
    clearTimeout(searchState.t);
    searchState.t = setTimeout(() => setSearchQuery(input.value), 80);
}
function rememberQuery(q) {
    q = String(q || '').trim();
    if (!q || !queryTokens(q).length) return;
    const list = store.json(RECENT_KEY, []).filter(x => typeof x === 'string' && x.toLowerCase() !== q.toLowerCase());
    list.unshift(q);
    store.setJSON(RECENT_KEY, list.slice(0, 5));
}

/* 12c. Settings (§B5.12) */
OV_RENDER.settings = (ov, el) => {
    const pref = (S.info && S.info.pref) || 'auto';
    const opt = (v, l) => `<button type="button" role="radio" aria-checked="${pref === v}" tabindex="${pref === v ? 0 : -1}" data-action="theme" data-value="${v}">${l}</button>`;
    el.innerHTML = `<div class="sheet__scrim" data-action="close"></div><div class="sheet__panel"><div class="sheet__grabber" aria-hidden="true"></div><div class="sheet__scroll">`
        + `<div class="sheet__head"><h2 id="stTitle" tabindex="-1">Settings</h2><button type="button" class="icon-btn" data-action="close" aria-label="Close">${icon('close')}</button></div>`
        + `<section class="setting"><h3 id="stAppearance">Appearance</h3><div class="segmented" role="radiogroup" aria-labelledby="stAppearance">${opt('auto', 'Auto')}${opt('light', 'Light')}${opt('dark', 'Dark')}</div>`
        + `<p class="setting__hint">Auto follows the time of day on Eagle Beach.</p></section>`
        + `<section class="setting"><div class="setting__row"><div><h3>Add to Home Screen</h3><p>Opens instantly, even offline.</p></div><a class="btn btn--secondary" href="qr.html">How</a></div></section>`
        + (IBEROCASH_NOTE ? `<section class="setting"><h3>About IberoCash</h3><p>${esc(IBEROCASH_NOTE)}</p></section>` : '')
        + `<section class="setting" data-offline-row hidden><div class="setting__row"><h3>Offline</h3><p data-offline-status></p></div></section>`
        + `<p class="foot-note">Version ${APP_VERSION} · content v${DATA_VERSION}</p></div></div>`;
    return { after: () => updateOfflineRow(el) };
};
async function updateOfflineRow(el) {
    try {
        if (!('serviceWorker' in navigator) || !navigator.serviceWorker.controller || !navigator.storage || !navigator.storage.estimate) return;
        const est = await navigator.storage.estimate();
        const row = $('[data-offline-row]', el);
        $('[data-offline-status]', el).textContent = `Ready · ${fmtBytes(est.usage || 0)}`;
        row.hidden = false;
    } catch (e) { /* ignore */ }
}
function setThemePref(v) {
    if (v === 'auto') store.remove('ib_theme'); else store.set('ib_theme', v);
    applyTheme();
    $$('#ovSettings [role="radio"]').forEach(b => { const on = b.dataset.value === v; b.setAttribute('aria-checked', String(on)); b.tabIndex = on ? 0 : -1; });
}

/* 12d. Menus action sheet (several PDFs) */
OV_RENDER.menus = (ov, el) => {
    const F = facet(ov.key);
    el.innerHTML = `<div class="sheet__scrim" data-action="close"></div><div class="sheet__panel"><div class="sheet__grabber" aria-hidden="true"></div><div class="sheet__scroll">`
        + `<div class="sheet__head"><h2 id="acTitle" tabindex="-1">${esc(cleanTitle(F.item))} menus</h2><button type="button" class="icon-btn" data-action="close" aria-label="Close">${icon('close')}</button></div>`
        + `<div>${menuRowsHTML(F)}</div></div></div>`;
};

/* 12e. Media overlay: menus (PDF) and video (§B5.10). Black in both themes. */
let videoTimer = 0;
function mediaBarHTML(title, sub, extra) {
    return `<div class="media__bar"><button type="button" class="icon-btn on-photo" data-action="close" aria-label="Close">${icon('close')}</button>`
        + `<div class="media__head"><h2 class="media__title" tabindex="-1">${esc(title)}</h2>${sub ? `<p class="media__sub">${esc(sub)}</p>` : ''}</div>${extra || ''}</div>`;
}
OV_RENDER.pdf = (ov, el) => {
    const F = facet(ov.key), p = F.menus[ov.i] || F.menus[0];
    el.classList.remove('media--video'); el.classList.add('media--pdf');
    el._onClosed = () => { el.innerHTML = ''; };
    if (!p) {
        el.setAttribute('aria-label', 'Menu');
        el.innerHTML = mediaBarHTML(cleanTitle(F.item), '') + `<div class="media__stage"><div class="media__panel"><p>This menu is no longer available.</p><button type="button" class="btn btn--secondary" data-action="close">Close</button></div></div>`;
        return;
    }
    const url = encodePath(p.url), meta = pdfMeta(p.url);
    el.setAttribute('aria-label', `${p.label}: ${cleanTitle(F.item)}`);
    const links = `<a class="btn--text media__link" href="${url}" target="_blank" rel="noopener">${icon('external')}<span>Open in new tab</span></a>`
        + `<a class="btn--text media__link" href="${url}" download>${icon('download')}<span>Download</span></a>`;
    if (isLg() && finePointer()) {
        el.innerHTML = mediaBarHTML(p.label, `${cleanTitle(F.item)} · ${meta}`, `<div class="media__links">${links}</div>`)
            + `<div class="media__stage media__stage--pdf"><iframe class="media__frame" title="${esc(p.label)}" src="${url}"></iframe></div>`;
    } else { // a deep link on a touch device: phones cannot page through an embedded PDF, so hand it to the system viewer
        el.innerHTML = mediaBarHTML(cleanTitle(F.item), '')
            + `<div class="media__stage"><div class="media__panel media__panel--doc"><span class="media__docic">${icon('doc')}</span><h3>${esc(p.label)}</h3><p>${esc(meta)}</p>`
            + `<a class="btn btn--primary" href="${url}" target="_blank" rel="noopener">${icon('external')}<span>Open ${esc(F.item.type === 'food' ? 'menu' : 'PDF')}</span></a>`
            + `<a class="btn--text media__link" href="${url}" download>${icon('download')}<span>Download</span></a></div></div>`;
    }
};
OV_RENDER.video = (ov, el) => {
    const F = facet(ov.key), it = F.item;
    el.classList.remove('media--pdf'); el.classList.add('media--video');
    el.setAttribute('aria-label', `Video tour: ${cleanTitle(it)}`);
    const vi = videoInfo(it);
    const poster = vi.poster ? encodePath(vi.poster) : (it.gallery[0] ? encodePath(it.gallery[0]) : '');
    el.innerHTML = mediaBarHTML(cleanTitle(it), ['Video tour', vi.dur].filter(Boolean).join(' · '))
        + `<div class="media__stage"><video class="media__video" controls playsinline preload="none"${poster ? ` poster="${poster}"` : ''} aria-label="Video tour of ${esc(cleanTitle(it))}"></video>`
        + `<div class="media__panel media__error" role="alert" hidden><span class="media__docic">${icon('wifi-off')}</span><p>Video unavailable. Check your connection and try again.</p>`
        + `<div class="media__actions"><button type="button" class="btn btn--primary" data-action="video-retry">Retry</button><button type="button" class="btn btn--ghost" data-action="close">Close</button></div></div></div>`;
    el._onClosed = () => { const v = $('video', el); if (v) { v.pause(); v.removeAttribute('src'); v.load(); } clearTimeout(videoTimer); el.innerHTML = ''; };
    return { after: () => startVideo(el, it.video) };
};
function startVideo(el, url) {
    const v = $('video', el), err = $('.media__error', el);
    if (!v) return;
    err.hidden = true; v.hidden = false;
    clearTimeout(videoTimer);
    const fail = () => {
        clearTimeout(videoTimer);
        if (!err.hidden) return;
        try { v.pause(); } catch (e) { /* ignore */ }
        v.hidden = true; err.hidden = false;
        const r = $('[data-action="video-retry"]', err); if (r) r.focus({ preventScroll: true });
    };
    if (navigator.onLine === false) { fail(); return; }
    v.onerror = fail;
    v.oncanplay = () => clearTimeout(videoTimer);
    v.src = encodePath(url); // set directly (no <source>) so `error` fires on the element
    videoTimer = setTimeout(() => { if (v.readyState < 3 || v.networkState === 3) fail(); }, 12000);
    const p = v.play(); // inside the tap chain, so iOS allows playback with sound
    if (p && p.catch) p.catch(() => { if (v.networkState === 3) fail(); });
}

/* 12f. Lightbox (§B5.9): scroll-snap track, only the current slide ±1 hold a src, counter +
   replaceState paging, swipe-down to close, double-tap zoom, keyboard, lg thumbnail strip. */
let lbIO = null;
OV_RENDER.photos = (ov, el) => {
    const F = facet(ov.key), g = F.item.gallery, title = cleanTitle(F.item);
    el.setAttribute('aria-label', 'Photos: ' + title);
    el.dataset.key = F.key;
    el.classList.remove('is-zoomed', 'is-dragging', 'is-dismissing');
    el.style.removeProperty('--lb-p');
    const many = g.length > 1;
    el.innerHTML = `<div class="lb__bar"><button type="button" class="icon-btn lb__btn" data-action="close" aria-label="Close photos">${icon('close')}</button>`
        + `<span class="lb__count" aria-hidden="true"></span><span class="sr-only" aria-live="polite" data-lb-live></span>`
        + `<button type="button" class="icon-btn lb__btn" data-action="share" data-key="${esc(F.key)}" aria-label="Share ${esc(title)}">${icon('share')}</button></div>`
        + `<div class="lb__track" tabindex="0" data-autofocus role="region" aria-roledescription="carousel" aria-label="${esc(title)} photos. Use the arrow keys to move, double-tap to zoom.">`
        + (g.length ? g.map((src, i) => `<div class="lb__slide" data-n="${i + 1}" role="group" aria-roledescription="slide" aria-label="${i + 1} of ${g.length}">`
            + imgHTML(src, { widths: [800, 1600], sizes: '100vw', alt: `${title}, photo ${i + 1} of ${g.length}`, lazySrc: true, eager: true }) + `</div>`).join('')
            : `<div class="lb__slide"><div class="media lb__empty">${phHTML(phSpecFor(F))}</div></div>`)
        + `</div>`
        + (many ? `<button type="button" class="lb__arrow lb__arrow--prev" data-action="lb-prev" aria-label="Previous photo">${icon('chevron-left')}</button><button type="button" class="lb__arrow lb__arrow--next" data-action="lb-next" aria-label="Next photo">${icon('chevron-right')}</button>`
            + `<div class="lb__thumbs" role="group" aria-label="All photos">${g.map((src, i) => `<button type="button" class="lb__thumb" data-action="lb-go" data-n="${i + 1}" aria-label="Photo ${i + 1} of ${g.length}">`
                + `<span class="media"${mediaAttrs(src)}>${imgHTML(src, { widths: [480], sizes: '64px', alt: '' })}</span></button>`).join('')}</div>` : '');
    el._onClosed = () => { if (lbIO) { lbIO.disconnect(); lbIO = null; } el.innerHTML = ''; };
    return { after: () => { lbWire(el); lbGoTo(ov.n, true); sweepImages(el); } };
};
function lbWire(el) {
    if (lbIO) lbIO.disconnect();
    const track = $('.lb__track', el), slides = $$('.lb__slide', track);
    if (!('IntersectionObserver' in window)) return;
    lbIO = new IntersectionObserver(es => es.forEach(e => {
        if (!e.isIntersecting || el.dataset.jumping) return;
        const n = parseInt(e.target.dataset.n, 10);
        if (!n || String(n) === el.dataset.cur) return;
        lbSetCurrent(el, n, slides.length);
        lbReplaceUrl(el, n);
    }), { root: track, threshold: 0.6 });
    slides.forEach(s => lbIO.observe(s));
    lbGestures(el, track);
}
function lbReplaceUrl(el, n) {
    const h = itemHash(el.dataset.key, '/photos/' + n);
    const top = S.route && S.route.overlays.find(o => o.type === 'photos');
    if (!top || location.hash === h) return;
    history.replaceState(Object.assign({}, history.state), '', h);
    top.n = n;
    lastRendered = location.hash;
}
function lbSetCurrent(el, n, total) {
    $('.lb__count', el).textContent = total > 1 ? `${n} / ${total}` : '';
    $('[data-lb-live]', el).textContent = `Photo ${n} of ${total}`;
    const slides = $$('.lb__slide', el);
    slides.forEach((s, i) => {
        if (Math.abs(i + 1 - n) <= 1) loadLazyImg($('img', s));
        if (i + 1 !== n && s.classList.contains('is-zoomed')) lbUnzoom(s);
    });
    $$('.lb__thumb', el).forEach(t => { const on = t.dataset.n === String(n); if (on) t.setAttribute('aria-current', 'true'); else t.removeAttribute('aria-current'); });
    const th = $(`.lb__thumb[data-n="${n}"]`, el);
    if (th && th.offsetParent) { const box = th.parentElement; box.scrollTo({ left: th.offsetLeft - (box.clientWidth - th.offsetWidth) / 2, behavior: reduceMotion() ? 'auto' : 'smooth' }); }
    const p = $('[data-action="lb-prev"]', el), x = $('[data-action="lb-next"]', el);
    if (p) p.disabled = n <= 1;
    if (x) x.disabled = n >= total;
    el.dataset.cur = String(n);
    heroTo(n - 1, true); // the sheet's carousel shows the same photo when the lightbox closes
}
function lbGoTo(n, instant) {
    const el = $('#ovLightbox'), track = el && $('.lb__track', el);
    if (!track) return;
    const total = track.children.length;
    n = Math.max(1, Math.min(total, n || 1));
    lbSetCurrent(el, n, total);
    lbReplaceUrl(el, n);
    const smooth = !instant && !reduceMotion();
    // intermediate slides would otherwise flash through the observer while a long jump animates
    if (smooth) { el.dataset.jumping = '1'; clearTimeout(el._jumpT); el._jumpT = setTimeout(() => { delete el.dataset.jumping; }, 500); }
    track.scrollTo({ left: (n - 1) * track.clientWidth, behavior: smooth ? 'smooth' : 'auto' });
}
function lbUnzoom(slide) {
    const img = $('img', slide);
    slide.classList.remove('is-zoomed');
    if (img) img.style.width = '';
    slide.scrollTo(0, 0);
    const el = slide.closest('.lightbox');
    if (el && !$('.lb__slide.is-zoomed', el)) el.classList.remove('is-zoomed');
}
/* Double-tap / double-click zoom to 2.5× the fitted size, keeping the tapped point under the finger. */
function lbToggleZoom(slide, cx, cy) {
    const img = $('img', slide), el = slide.closest('.lightbox');
    if (!img || !img.classList.contains('is-loaded')) return;
    if (slide.classList.contains('is-zoomed')) { lbUnzoom(slide); return; }
    const r = img.getBoundingClientRect(), sr = slide.getBoundingClientRect();
    const fx = Math.min(1, Math.max(0, (cx - r.left) / r.width)), fy = Math.min(1, Math.max(0, (cy - r.top) / r.height));
    const W = r.width * 2.5;
    slide.classList.add('is-zoomed');
    el.classList.add('is-zoomed');
    img.style.width = W + 'px';
    const H = img.getBoundingClientRect().height; // forces layout at the zoomed size
    slide.scrollLeft = img.offsetLeft + fx * W - (cx - sr.left);
    slide.scrollTop = img.offsetTop + fy * H - (cy - sr.top);
}
/* Pointer gestures on the track. touch-action is pan-x on unzoomed slides, so a vertical drag is
   never claimed by the browser and keeps delivering pointer events (no pointercancel). */
function lbGestures(el, track) {
    let g = null, lastTap = null;
    const bgFor = dy => Math.min(1, Math.abs(dy) / 320);
    track.addEventListener('pointerdown', e => {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        const slide = e.target.closest('.lb__slide');
        g = slide ? { id: e.pointerId, x: e.clientX, y: e.clientY, t: e.timeStamp, lock: '', slide, dy: 0, dx: 0, mouse: e.pointerType === 'mouse' } : null;
    });
    track.addEventListener('pointermove', e => {
        if (!g || e.pointerId !== g.id) return;
        const dx = e.clientX - g.x, dy = e.clientY - g.y;
        if (!g.lock) {
            if (Math.hypot(dx, dy) < 10) return;
            const vertical = Math.abs(dy) > Math.abs(dx) && !g.slide.classList.contains('is-zoomed') && !(window.visualViewport && visualViewport.scale > 1.01);
            g.lock = vertical ? 'y' : 'x';
            if (!vertical) return;
            g.img = $('img', g.slide) || $('.lb__empty', g.slide);
            el.classList.add('is-dragging');
            try { track.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
        }
        if (g.lock !== 'y') return;
        e.preventDefault();
        g.dx = dx; g.dy = dy;
        const p = bgFor(dy);
        if (g.img) g.img.style.transform = `translate3d(${dx * 0.35}px,${dy}px,0) scale(${1 - 0.1 * p})`;
        el.style.setProperty('--lb-p', p.toFixed(3));
    });
    const end = e => {
        if (!g || (e && e.pointerId !== g.id)) return;
        const G = g; g = null;
        if (G.lock === 'y') {
            el.classList.remove('is-dragging');
            if (Math.abs(G.dy) > 100) { el.classList.add('is-dismissing'); closeTop(); return; }
            if (G.img) G.img.style.transform = '';
            el.style.removeProperty('--lb-p');
            return;
        }
        if (G.lock || !e || e.type !== 'pointerup' || G.mouse) return;
        // a tap: two within 300 ms and 30 px make a double-tap
        const now = e.timeStamp;
        if (lastTap && now - lastTap.t < 300 && Math.hypot(e.clientX - lastTap.x, e.clientY - lastTap.y) < 30) {
            lastTap = null;
            lbToggleZoom(G.slide, e.clientX, e.clientY);
        } else lastTap = { t: now, x: e.clientX, y: e.clientY };
    };
    track.addEventListener('pointerup', end);
    track.addEventListener('pointercancel', e => { if (g && g.lock === 'y') end(e); else g = null; });
    track.addEventListener('dblclick', e => { const s = e.target.closest('.lb__slide'); if (s) { e.preventDefault(); lbToggleZoom(s, e.clientX, e.clientY); } });
}

/* 12g. Concierge request (§B5.11) and tickets. No backend: nothing is submitted anywhere. The
   form only prepares a summary the guest shows (ticket), shares, or sends on WhatsApp when a
   verified number exists. The draft is kept per item in localStorage `ib_requests`. */
const RQ_KEY = 'ib_requests';
const rqAddonRow = r => /^(add-on|optional|extra)\b/i.test(r.label);
const rqInfoRow = r => /^each additional/i.test(r.label);
const rqChildRow = r => /\b(child|children|kid|kids)\b/i.test(r.label);
/* Bookable options: ≥2 rows that are not add-ons, per-extra-guest or child prices. */
function rqOptions(F) { const rows = F.rows.filter(r => !rqAddonRow(r) && !rqInfoRow(r) && !rqChildRow(r)); return rows.length >= 2 ? rows : []; }
const rqAddons = F => F.rows.filter(rqAddonRow);
const rqAddonLabel = r => r.label.replace(/^(add-on|optional|extra)\s*:?\s*/i, '');
const enDash = t => String(t).replace(/(\d)\s*-\s*(\d)/g, '$1–$2'); // "1-2 Guests" → "1–2 Guests"
function rqSessions(F) {
    const s = F.slots;
    if (s.length < 2) return null;
    if (s.some(x => /pickup/i.test(x.label))) { // pickup points (Highrise/Lowrise) are a real choice; "tour + pickup" is not
        return s.every(x => x.note) ? { legend: 'Pickup', opts: s.map(x => ({ id: x.note, label: x.note, sub: x.short || x.value })) } : null;
    }
    return { legend: 'Session', opts: s.map(x => {
        const st = x.range ? x.range.start : null;
        const lab = x.label || (st == null ? '' : st < 720 ? 'Morning' : st < 1020 ? 'Afternoon' : 'Evening');
        return { id: (lab ? lab + ' · ' : '') + (x.short || x.value), label: lab || x.value, sub: lab ? (x.short || x.value) : '' };
    }) };
}
const rqHasChildren = F => F.rows.some(rqChildRow);
function rqDates() {
    const n = arubaNow();
    const at = add => new Date(Date.UTC(n.y, n.mo - 1, n.d + add));
    const iso = d => d.toISOString().slice(0, 10);
    return { today: iso(at(0)), tomorrow: iso(at(1)) };
}
function fmtDay(iso) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
    if (!m) return '';
    try { return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' }); } catch (e) { return iso; }
}
function rqAll() { const a = store.json(RQ_KEY, {}); return a && typeof a === 'object' && !Array.isArray(a) ? a : {}; }
function rqDraft(F) {
    const d = rqAll()[F.key];
    const info = S.info || phaseInfo();
    const starts = F.slots.map(s => s.range && s.range.start).filter(m => m != null);
    // After 23:00 the next bookable day is tomorrow; after midnight it is today again.
    const gone = (info.late && info.now.m >= 1380) || (starts.length > 0 && starts.every(m => m <= info.now.m));
    const opts = rqOptions(F), sess = rqSessions(F);
    const base = { opt: opts[0] ? opts[0].label : '', sess: sess ? sess.opts[0].id : '', date: gone ? 'tomorrow' : 'today', other: '', adults: 2, children: 0, time: '', room: '', note: '', addons: [] };
    const out = Object.assign(base, d && typeof d === 'object' ? d : {});
    // sanitise a stale draft
    if (opts.length && !opts.some(r => r.label === out.opt)) out.opt = base.opt;
    if (sess && !sess.opts.some(o => o.id === out.sess)) out.sess = base.sess;
    if (!['today', 'tomorrow', 'other'].includes(out.date)) out.date = base.date;
    if (out.date === 'other' && out.other && out.other < rqDates().today) out.other = '';
    out.adults = Math.min(20, Math.max(1, parseInt(out.adults, 10) || 2));
    out.children = rqHasChildren(F) ? Math.min(10, Math.max(0, parseInt(out.children, 10) || 0)) : 0;
    out.addons = Array.isArray(out.addons) ? out.addons.filter(a => rqAddons(F).some(r => r.label === a)) : [];
    out.time = /^\d{2}:\d{2}$/.test(out.time || '') && F.item.type === 'food' ? out.time : '';
    out.room = String(out.room || '').slice(0, 12); out.note = String(out.note || '').slice(0, 500);
    return out;
}
function rqSave(key, d) {
    const all = rqAll();
    all[key] = Object.assign({}, d, { t: Date.now() });
    Object.keys(all).sort((a, b) => (all[b].t || 0) - (all[a].t || 0)).slice(20).forEach(k => delete all[k]); // keep the 20 latest
    store.setJSON(RQ_KEY, all);
}
function rqRead(form) {
    const v = n => { const el = form.elements[n]; return el ? (el.value || '') : ''; };
    return { opt: v('opt'), sess: v('sess'), date: v('date') || 'today', other: v('other'), adults: +v('adults') || 2, children: +v('children') || 0, time: v('time'),
        room: v('room').trim(), note: v('note').trim(), addons: $$('input[name="addon"]:checked', form).map(i => i.value) };
}
function rqDateText(d) {
    const ds = rqDates();
    if (d.date === 'today') return `Today, ${fmtDay(ds.today)}`;
    if (d.date === 'tomorrow') return `Tomorrow, ${fmtDay(ds.tomorrow)}`;
    return d.other ? fmtDay(d.other) : 'Date to confirm';
}
/* [[label, value, sub?]] for the ticket and the shared text. */
function rqRows(F, d) {
    const rows = [];
    const opt = rqOptions(F).find(r => r.label === d.opt);
    if (opt) rows.push(['Option', enDash(opt.label), opt.text]);
    else if (F.from) rows.push(['From', fromText(F.from)]);
    if (d.sess) rows.push([(rqSessions(F) || {}).legend || 'Session', d.sess]);
    rows.push(['Date', rqDateText(d)]);
    if (d.time) { const [hh, mm] = d.time.split(':').map(Number); rows.push(['Time', fmtClock(hh * 60 + mm) + ' (preferred)']); }
    rows.push(['Guests', plural(d.adults, 'adult') + (d.children ? ' · ' + plural(d.children, 'child', 'children') : '')]);
    const adds = rqAddons(F).filter(r => d.addons.includes(r.label));
    if (adds.length) rows.push(['Add-ons', adds.map(r => `${rqAddonLabel(r)} (${r.text})`).join(', ')]);
    if (d.room) rows.push(['Room', d.room]);
    if (d.note) rows.push(['Note', d.note]);
    return rows;
}
function rqText(F, d) {
    const it = F.item;
    return [`Concierge request: ${it.title}`, partnerName(it) || '', ...rqRows(F, d).map(r => `${r[0]}: ${r[1]}${r[2] ? ' (' + r[2] + ')' : ''}`), '',
        'Request only. Not a confirmed booking.'].filter((l, i) => l || i > 1).join('\n');
}
const rqWhatsApp = it => String(it.whatsapp || CONCIERGE.whatsapp || '').replace(/\D/g, '');
function stepperHTML(name, label, val, min, max) {
    const id = 'rq-' + name;
    return `<div class="stepper" role="group" aria-labelledby="${id}-l"><span class="stepper__label" id="${id}-l">${label}</span>`
        + `<div class="stepper__ctl"><button type="button" class="stepper__btn" data-action="rq-step" data-f="${name}" data-d="-1" aria-label="Fewer ${label.toLowerCase()}"${val <= min ? ' disabled' : ''}>${icon('minus')}</button>`
        + `<output class="stepper__val" id="${id}-v" aria-live="polite" aria-label="${label}">${val}</output>`
        + `<button type="button" class="stepper__btn" data-action="rq-step" data-f="${name}" data-d="1" aria-label="More ${label.toLowerCase()}"${val >= max ? ' disabled' : ''}>${icon('plus')}</button></div>`
        + `<input type="hidden" name="${name}" value="${val}" data-min="${min}" data-max="${max}"></div>`;
}
OV_RENDER.request = (ov, el) => {
    const F = facet(ov.key), it = F.item, d = rqDraft(F), ds = rqDates();
    const opts = rqOptions(F), sess = rqSessions(F), adds = rqAddons(F), wa = rqWhatsApp(it);
    const radio = (name, value, checked, inner, cls) => `<label class="${cls}"><input type="radio" name="${name}" value="${esc(value)}"${checked ? ' checked' : ''}>${inner}</label>`;
    let h = `<div class="sheet__scrim" data-action="close"></div><div class="sheet__panel"><div class="sheet__grabber" aria-hidden="true"></div><div class="sheet__scroll">`
        + `<div class="sheet__head"><h2 id="rqTitle" tabindex="-1">Request with concierge</h2><button type="button" class="icon-btn" data-action="close" aria-label="Close">${icon('close')}</button></div>`
        + `<form class="rq" data-rq="${esc(F.key)}" novalidate>`
        + `<div class="rq__item">${mediaBox(F, { widths: [480], sizes: '56px' })}<div class="rq__itemtext"><p class="rq__itemtitle">${esc(cleanTitle(it))}</p>`
        + `<p class="rq__itemsub">${esc([partnerName(it), F.from && !opts.length ? fromText(F.from) : ''].filter(Boolean).join(' · '))}</p></div></div>`;
    if (opts.length) h += `<fieldset class="rq__group"><legend>Option</legend><div class="rq__opts">`
        + opts.map(r => radio('opt', r.label, r.label === d.opt, `<span class="rq__optl">${esc(enDash(r.label))}</span><span class="rq__optp">${esc(r.text)}</span>`, 'rq__opt')).join('') + `</div></fieldset>`;
    if (sess) h += `<fieldset class="rq__group"><legend>${sess.legend}</legend><div class="rq__chips">`
        + sess.opts.map(o => radio('sess', o.id, o.id === d.sess, `<span>${esc(o.label)}${o.sub ? ` <small>${esc(o.sub)}</small>` : ''}</span>`, 'rq__chip')).join('') + `</div></fieldset>`;
    h += `<fieldset class="rq__group"><legend>Date</legend><div class="rq__seg">`
        + radio('date', 'today', d.date === 'today', `<span>Today<small>${esc(fmtDay(ds.today))}</small></span>`, 'rq__segopt')
        + radio('date', 'tomorrow', d.date === 'tomorrow', `<span>Tomorrow<small>${esc(fmtDay(ds.tomorrow))}</small></span>`, 'rq__segopt')
        + radio('date', 'other', d.date === 'other', `<span>Other…<small data-other-label>${esc(d.other ? fmtDay(d.other) : 'Pick a date')}</small></span>`, 'rq__segopt')
        + `</div><label class="rq__field rq__date"${d.date === 'other' ? '' : ' hidden'}><span>Choose a date</span><input class="rq__input" type="date" name="other" min="${ds.today}" value="${esc(d.other)}"></label></fieldset>`;
    h += `<fieldset class="rq__group"><legend>Guests</legend><div class="rq__steppers">${stepperHTML('adults', 'Adults', d.adults, 1, 20)}`
        + (rqHasChildren(F) ? stepperHTML('children', 'Children', d.children, 0, 10) : '') + `</div></fieldset>`;
    if (adds.length) h += `<fieldset class="rq__group"><legend>Add-ons</legend><div class="rq__adds">`
        + adds.map(r => `<label class="rq__add"><input type="checkbox" name="addon" value="${esc(r.label)}"${d.addons.includes(r.label) ? ' checked' : ''}><span class="rq__addl">${esc(rqAddonLabel(r))}</span><span class="rq__optp">${esc(r.text)}</span></label>`).join('') + `</div></fieldset>`;
    h += `<div class="rq__group rq__fields">`
        + (it.type === 'food' ? `<label class="rq__field"><span>Preferred time <em>optional</em></span><input class="rq__input" type="time" name="time" step="900" value="${esc(d.time)}"></label>` : '')
        + `<label class="rq__field"><span>Room number <em>optional</em></span><input class="rq__input" name="room" inputmode="numeric" autocomplete="off" maxlength="12" value="${esc(d.room)}"></label>`
        + `<label class="rq__field"><span>Note for the concierge <em>optional</em></span><textarea class="rq__input" name="note" rows="2" maxlength="500" placeholder="Allergies, celebrations, pickup questions…">${esc(d.note)}</textarea></label></div>`
        + `<p class="rq__hint">${icon('info')}<span>Nothing is sent from this page. Show the request at the concierge desk to check availability and book.</span></p>`
        + `<div class="rq__foot"><button type="submit" class="btn btn--primary">Show to concierge</button>`
        + `<button type="button" class="btn btn--secondary" data-action="rq-share">${icon('share')}<span>Share request</span></button>`
        + (wa ? `<button type="button" class="btn btn--secondary" data-action="rq-wa">Send on WhatsApp</button>` : '') + `</div></form></div></div>`;
    el.innerHTML = h;
};
function rqForm() { return $('#ovRequest form.rq'); }
function rqPersist(form) {
    form = form || rqForm();
    if (!form) return null;
    const d = rqRead(form);
    rqSave(form.dataset.rq, d);
    const date = $('.rq__date', form);
    if (date) date.hidden = d.date !== 'other';
    const lab = $('[data-other-label]', form);
    if (lab) lab.textContent = d.other ? fmtDay(d.other) : 'Pick a date';
    return d;
}
function rqStep(b) {
    const form = b.closest('form'), inp = form.elements[b.dataset.f];
    const min = +inp.dataset.min, max = +inp.dataset.max;
    const v = Math.min(max, Math.max(min, (+inp.value || 0) + (+b.dataset.d)));
    inp.value = String(v);
    const box = b.closest('.stepper');
    $('output', box).textContent = String(v);
    const [minus, plus] = $$('.stepper__btn', box);
    minus.disabled = v <= min; plus.disabled = v >= max;
    if (b.disabled) (b === minus ? plus : minus).focus(); // keep focus inside the stepper at a limit
    rqPersist(form);
}
function rqValid(form) {
    const d = rqRead(form);
    if (d.date === 'other' && !d.other) {
        const i = form.elements.other; const lab = $('.rq__date', form); if (lab) lab.hidden = false;
        if (i) i.focus();
        toast('Choose a date first');
        return null;
    }
    return d;
}
function rqSubmit(form) {
    const d = rqValid(form);
    if (!d) return;
    rqSave(form.dataset.rq, d);
    navigate(itemHash(form.dataset.rq, '/request/show'));
}
async function rqShare() {
    const form = rqForm(); if (!form) return;
    const d = rqValid(form); if (!d) return;
    rqSave(form.dataset.rq, d);
    const F = facet(form.dataset.rq);
    const url = location.origin + location.pathname + itemHash(F.key);
    const text = rqText(F, d);
    try { if (navigator.share) { await navigator.share({ title: 'Concierge request', text, url }); return; } } catch (e) { if (e && e.name === 'AbortError') return; }
    const ok = await copyText(text + '\n' + url);
    toast(ok ? 'Request copied' : 'Could not copy the request');
}
function rqWa() {
    const form = rqForm(); if (!form) return;
    const d = rqValid(form); if (!d) return;
    const F = facet(form.dataset.rq), n = rqWhatsApp(F.item);
    if (!n) return;
    rqSave(F.key, d);
    window.open(`https://wa.me/${n}?text=${encodeURIComponent(rqText(F, d))}`, '_blank', 'noopener');
}

/* Tickets: always white with navy text so staff can read them in any theme or brightness. */
let wakeLock = null;
function keepAwake(el) {
    try {
        if (navigator.wakeLock) navigator.wakeLock.request('screen').then(l => { wakeLock = l; }).catch(() => {});
    } catch (e) { /* best effort */ }
    el._onClosed = () => { try { if (wakeLock) wakeLock.release(); } catch (e) { /* ignore */ } wakeLock = null; };
}
function ticketHTML(o) {
    const n = arubaNow();
    return `<div class="ticket__inner"><button type="button" class="icon-btn ticket__close" data-action="close" aria-label="Close">${icon('close')}</button>`
        + `<div class="ticket__card"><div class="ticket__top">${o.media || ''}<div class="ticket__head"><p class="ticket__eyebrow">${esc(o.eyebrow || 'Concierge request')}</p>`
        + `<h2 class="ticket__title" id="tkTitle" tabindex="-1">${esc(o.title)}</h2>${o.sub ? `<p class="ticket__sub">${esc(o.sub)}</p>` : ''}</div></div>`
        + `<div class="ticket__perf" aria-hidden="true"></div>`
        + (o.rows.length ? `<dl class="ticket__rows">${o.rows.map(r => `<div><dt>${esc(r[0])}</dt><dd>${esc(r[1])}${r[2] ? `<small>${esc(r[2])}</small>` : ''}</dd></div>`).join('')}</dl>` : (o.empty || ''))
        + `<p class="ticket__foot">${esc(o.foot || 'Request only. Not a confirmed booking. Please confirm availability with the concierge.')}</p>`
        + `<p class="ticket__stamp">Iberostar Aruba guest guide · ${esc(fmtDay(rqDates().today))}, ${esc(fmtClock(n.m))}</p></div></div>`;
}
OV_RENDER.ticket = (ov, el) => {
    const F = facet(ov.key);
    el.innerHTML = ticketHTML({ title: cleanTitle(F.item), sub: partnerName(F.item), rows: rqRows(F, rqDraft(F)),
        media: F.item.gallery.length ? mediaBox(F, { cls: 'ticket__media', widths: [480], sizes: '72px' }) : '' });
    keepAwake(el);
};
OV_RENDER.savedshow = (ov, el) => {
    const label = t => ({ food: 'Dine', fun: 'Explore', golf: 'Golf', store: 'Shop', spa: 'Spa', club: 'Resort' })[t] || 'Plan';
    const rows = S.saved.map(k => facet(k)).filter(Boolean).map(F => [label(F.item.type), cleanTitle(F.item),
        [partnerName(F.item), F.slots.length ? slotSummary(F.slots) : '', F.from ? fromText(F.from) : ''].filter(Boolean).join(' · ')]);
    el.innerHTML = ticketHTML({ eyebrow: 'Our plans', title: 'Please help us book', sub: plural(rows.length, 'item'), rows,
        empty: `<p class="ticket__empty">Nothing saved yet.</p>`,
        foot: 'A shortlist, not a booking. Please check availability and prices with the concierge.' });
    keepAwake(el);
};

/* ---------- 13. Events, kept globals, service worker, boot ---------- */
const ACTIONS = {
    save: (b) => toggleSave(b.dataset.key || S.detailKey, b),
    close: () => closeTop(),
    share: (b) => sharePackage(b.dataset.key || S.detailKey, b),
    photo: (b) => navigate(itemHash(S.detailKey, '/photos/' + (parseInt(b.dataset.n, 10) || 1))),
    'hero-prev': () => heroStep(-1),
    'hero-next': () => heroStep(1),
    'prices-more': (b) => { const sec = b.closest('.prices'); $$('[data-more]', sec).forEach(li => { li.hidden = false; }); b.setAttribute('aria-expanded', 'true'); b.hidden = true; },
    chip: (b) => { const v = b.dataset.view, st = S.filt[v], id = b.dataset.filter; if (st.f.has(id)) st.f.delete(id); else st.f.add(id); commitFilters(v); },
    'clear-filters': (b) => { const v = b.dataset.view; if (!S.filt[v]) return; S.filt[v].f.clear(); S.filt[v].q = ''; const inp = $(`[data-inline-search="${v}"]`); if (inp) inp.value = ''; commitFilters(v); },
    'field-clear': (b) => { const v = b.dataset.view, inp = $(`[data-inline-search="${v}"]`); S.filt[v].q = ''; if (inp) { inp.value = ''; inp.focus(); } commitFilters(v); },
    'search-clear': () => { const i = $('#searchInput'); if (i) { i.value = ''; i.focus(); onSearchInput(i); } },
    'search-all': (b) => { searchState.showAll.add(b.dataset.group); const y = $('#ovSearch .search__body').scrollTop; renderSearchResults(); $('#ovSearch .search__body').scrollTop = y; },
    'search-q': (b) => { const i = $('#searchInput'); if (!i) return; clearTimeout(searchState.t); i.value = b.dataset.q; setSearchQuery(b.dataset.q); },
    'lb-go': (b) => lbGoTo(parseInt(b.dataset.n, 10) || 1),
    iberocash: () => { if (IBEROCASH_NOTE) toast(IBEROCASH_NOTE, { ms: 6000 }); },
    'recent-clear': () => { store.remove(RECENT_KEY); renderSearchResults(); },
    theme: (b) => setThemePref(b.dataset.value),
    'exit-preview': () => { store.remove('ib_admin_preview'); location.reload(); },
    reload: () => location.reload(),
    'a2hs-dismiss': (b) => { store.set('ib_a2hs_dismissed', '1'); const a = b.closest('.a2hs'); if (a) a.remove(); },
    install: async () => { if (!deferredInstall) return; deferredInstall.prompt(); try { await deferredInstall.userChoice; } catch (e) { /* ignore */ } deferredInstall = null; S.dirty.add('today'); },
    'saved-share': (b) => shareSaved(b),
    'shared-save-all': () => { const ks = S.shared || []; S.shared = null; ks.forEach(k => setSaved(k, true)); S.dirty.add('saved'); toast(`Saved ${plural(ks.length, 'item')}`); go('#/saved', { replace: true }); },
    'shared-dismiss': () => { S.shared = null; S.dirty.add('saved'); go('#/saved', { replace: true }); },
    menu: (b, e) => { // desktop + fine pointer → inline viewer; touch keeps the plain new-tab link
        if (isLg() && finePointer()) { e.preventDefault(); navigate(itemHash(b.dataset.key, '/menu/' + b.dataset.i), b.closest('#ovAction') ? { dataset: { replace: '1' } } : null); return true; }
        return 'native';
    },
    'video-retry': () => { const r = S.route; const o = r && r.overlays.find(x => x.type === 'video'); if (o) startVideo($('#ovMedia'), appData[o.key].video); },
    'lb-prev': () => { const el = $('#ovLightbox'); lbGoTo((parseInt(el.dataset.cur, 10) || 1) - 1); },
    'lb-next': () => { const el = $('#ovLightbox'); lbGoTo((parseInt(el.dataset.cur, 10) || 1) + 1); },
    'open-search': () => 'link',
    'rq-step': (b) => rqStep(b),
    'rq-share': () => rqShare(),
    'rq-wa': () => rqWa()
};
function onClick(e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const act = e.target.closest('[data-action]');
    if (act && !act.disabled && ACTIONS[act.dataset.action]) {
        const r = ACTIONS[act.dataset.action](act, e);
        if (r === 'native') return;
        if (r !== 'link') { e.preventDefault(); return; }
    }
    const off = e.target.closest('[data-needs-net][aria-disabled="true"]');
    if (off) { e.preventDefault(); toast('Video needs Wi-Fi'); return; }
    const a = e.target.closest('a[href^="#/"]');
    if (!a) return;
    e.preventDefault();
    if (a.closest('#ovSearch') && a.closest('.srow')) rememberQuery(searchState.q);
    navigate(a.getAttribute('href'), a);
}
function onKey(e) {
    if (!e.metaKey && !e.ctrlKey && /^(Tab|Arrow|Enter| |Escape|Home|End)/.test(e.key)) document.documentElement.classList.add('kbd');
    if (e.key === 'Escape' && Overlay.stack.length) { e.preventDefault(); closeTop(); return; }
    if (e.key === 'Tab') trapTab(e);
    // Space on a card's stretched link opens it too (links only react to Enter natively)
    if (e.key === ' ' && e.target.matches && e.target.matches('a.card__link, .srow a, a.menu-row, a.video-row')) { e.preventDefault(); e.target.click(); return; }
    const top = Overlay.top();
    if (top && top.el.id === 'ovLightbox' && !e.target.matches('input,textarea')) {
        const el = top.el, cur = parseInt(el.dataset.cur, 10) || 1, n = $$('.lb__slide', el).length;
        const map = { ArrowLeft: cur - 1, ArrowRight: cur + 1, Home: 1, End: n };
        if (map[e.key] != null) { e.preventDefault(); lbGoTo(map[e.key]); }
    }
    if (e.target.matches && e.target.matches('[role="radio"]') && /^Arrow/.test(e.key)) {
        const radios = $$('[role="radio"]', e.target.closest('[role="radiogroup"]'));
        const i = radios.indexOf(e.target), d = /Right|Down/.test(e.key) ? 1 : -1;
        const next = radios[(i + d + radios.length) % radios.length];
        e.preventDefault(); next.focus(); next.click();
    }
    if (e.key === 'Enter' && e.target.id === 'searchInput') { rememberQuery(e.target.value); e.target.blur(); }
}
function onInput(e) {
    const t = e.target;
    if (t.dataset && t.dataset.inlineSearch) {
        const clear = t.parentElement.querySelector('.field__clear');
        if (clear) clear.hidden = !t.value;
        onInlineInput(t);
    } else if (t.form && t.form.classList.contains('rq')) {
        rqPersist(t.form);
    } else if (t.id === 'searchInput') {
        $('#ovSearch [data-action="search-clear"]').hidden = !t.value;
        onSearchInput(t);
    }
}
/* In-house mode: 3 pointerups on the Today greeting within 1.5 s. No visual reaction, no theme change. */
let taps = [];
function onGreetingTap(e) {
    if (!e.target.closest || !e.target.closest('.today__greeting')) return;
    const now = Date.now();
    taps = taps.filter(t => now - t < 1500);
    taps.push(now);
    if (taps.length >= 3) { taps = []; setInHouse(!S.inHouse, true); }
}
function setInHouse(on, notify) {
    S.inHouse = on;
    store.set('ib_in_house', on ? 'true' : 'false');
    ['explore', 'today'].forEach(v => S.dirty.add(v));
    if (S.view === 'explore' || S.view === 'today') renderView(S.view);
    if (notify) toast(on ? 'Showing in-house partners (Red Sail)' : 'Showing all tour partners');
}

/* Kept globals (§B.9) */
const NAV_IDS = { portfolio: '#/resorts', dining: '#/dine', activities: '#/explore', spa: '#/spa', golf: '#/explore?f=golf', store: '#/explore?f=shop', today: '#/today', dine: '#/dine', explore: '#/explore', saved: '#/saved', resorts: '#/resorts' };
function nav(id) { navigate(NAV_IDS[id] || '#/today'); }
function renderApp(id) { nav(id); }
function openDetails(key) { if (appData[key]) navigate(itemHash(key)); }
function launchLightbox(listOrKey, i) {
    const key = typeof listOrKey === 'string' ? listOrKey : S.detailKey;
    if (key && appData[key]) navigate(itemHash(key, '/photos/' + ((i || 0) + 1)));
}
function findByUrl(field, url) {
    for (const F of FACETS.values()) {
        if (field === 'pdf') { const i = F.menus.findIndex(p => p.url === url); if (i >= 0) return { key: F.key, i }; }
        else if (F.item[field] === url) return { key: F.key };
    }
    return null;
}
function viewPdf(url) {
    const hit = findByUrl('pdf', url);
    if (hit && isLg() && finePointer()) navigate(itemHash(hit.key, '/menu/' + hit.i));
    else window.open(encodePath(url), '_blank', 'noopener');
}
function viewVideo(url) { const hit = findByUrl('video', url); if (hit) navigate(itemHash(hit.key, '/video')); }
async function sharePackage(key, btn) {
    const it = appData[key];
    if (!it) return;
    const url = location.origin + location.pathname + '#/item/' + encodeURIComponent(key);
    const flash = () => {
        if (!btn) return;
        const u = btn.querySelector('use'); if (!u) return;
        const prev = u.getAttribute('href'); u.setAttribute('href', '#i-check');
        setTimeout(() => u.setAttribute('href', prev), 1200);
    };
    try {
        if (navigator.share) { await navigator.share({ title: it.title, text: `${it.title} — ${it.sub}`, url }); flash(); return; }
    } catch (e) { if (e && e.name === 'AbortError') return; }
    const ok = await copyText(`${it.title} — ${it.sub}\n${url}`);
    toast(ok ? 'Link copied' : url);
    if (ok) flash();
}
function showToast(msg) { toast(msg); }

/* Service worker (§C.2) — registers only on https/localhost, after first render. */
function initServiceWorker(params) {
    if (!('serviceWorker' in navigator)) return;
    if (params.nosw) {
        navigator.serviceWorker.getRegistrations().then(rs => rs.forEach(r => r.unregister())).catch(() => {});
        if (window.caches) caches.keys().then(ks => ks.filter(k => k.startsWith('ib-')).forEach(k => caches.delete(k))).catch(() => {});
        return;
    }
    const secure = location.protocol === 'https:' || ['localhost', '127.0.0.1'].includes(location.hostname);
    if (!secure) return;
    const hadController = !!navigator.serviceWorker.controller;
    let reloading = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => { if (reloading || !hadController) return; reloading = true; location.reload(); });
    navigator.serviceWorker.register('sw.js').then(reg => {
        const offer = w => {
            if (!w || !hadController || S.swWaiting === w) return;
            S.swWaiting = w;
            showUpdateToast();
        };
        if (reg.waiting) offer(reg.waiting);
        reg.addEventListener('updatefound', () => {
            const w = reg.installing;
            if (w) w.addEventListener('statechange', () => { if (w.state === 'installed' && reg.waiting === w) offer(w); });
        });
        // Warm the card-size photos once per session, after the worker is active (§C.1 'warm').
        navigator.serviceWorker.ready.then(r => {
            if (!r.active || store.sget('ib_warmed') === String(DATA_VERSION)) return;
            idle(() => { try { r.active.postMessage({ type: 'warm' }); store.sset('ib_warmed', String(DATA_VERSION)); } catch (e) { /* ignore */ } });
        }).catch(() => {});
    }).catch(() => { /* sw.js missing or blocked: the app works without it */ });
}
/* "Updated info available · Refresh" (5 s). Re-shown once more on the next tab switch or return to the app. */
function showUpdateToast() {
    const w = S.swWaiting;
    if (!w || S.swReloading) return;
    S.swToasts = (S.swToasts || 0) + 1;
    toast('Updated info available', { action: 'Refresh', ms: 5000, onAction: () => { S.swReloading = true; try { w.postMessage({ type: 'skip-waiting' }); } catch (e) { location.reload(); } } });
}
function maybeReshowUpdate() { if (S.swWaiting && S.swToasts === 1) showUpdateToast(); }
const idle = fn => ('requestIdleCallback' in window ? requestIdleCallback(fn, { timeout: 4000 }) : setTimeout(fn, 2000));

/* URL params: ?mode=inhouse|offsite, ?time= (handled pre-paint), ?nosw=1 — read, then stripped. */
function readUrlParams() {
    const out = {};
    const sp = new URLSearchParams(location.search);
    const hq = location.hash.includes('?') ? new URLSearchParams(location.hash.split('?')[1]) : new URLSearchParams('');
    const get = k => sp.get(k) || hq.get(k);
    const mode = get('mode');
    if (mode === 'inhouse' || mode === 'offsite') { S.inHouse = mode === 'inhouse'; store.set('ib_in_house', S.inHouse ? 'true' : 'false'); }
    out.nosw = get('nosw') === '1';
    if (['mode', 'time', 'nosw'].some(k => sp.has(k) || hq.has(k))) {
        ['mode', 'time', 'nosw'].forEach(k => { sp.delete(k); hq.delete(k); });
        const path = location.hash.split('?')[0] || '';
        const hs = hq.toString(), ss = sp.toString();
        history.replaceState(history.state, '', location.pathname + (ss ? '?' + ss : '') + (path || '') + (hs ? '?' + hs : ''));
    }
    return out;
}
/* Cold deep link: rebuild [Today] → [parent view] → overlay levels so Back stays in the app. */
function seedHistory() {
    if (history.state && history.state.ib) return; // reload of an existing session entry
    const target = location.hash || '#/today';
    const r = parseRoute(target);
    if (r.bad || r.missing) { history.replaceState({ ib: 1, idx: 0 }, '', r.bad ? '#/today' : target); return; }
    const parentView = r.view || r.parent || 'today';
    let idx = 0;
    history.replaceState({ ib: 1, idx: 0 }, '', '#/today');
    if (parentView !== 'today') history.pushState({ ib: 1, idx: ++idx, fromToday: true }, '', parentView === r.view && !r.overlays.length ? target : '#/' + parentView);
    r.overlays.forEach((o, i) => {
        history.pushState({ ib: 1, idx: ++idx }, '', i === r.overlays.length - 1 ? target : ovHash(o, ''));
    });
    if (location.hash !== target) history.replaceState(history.state, '', target);
}
function boot() {
    try { history.scrollRestoration = 'manual'; } catch (e) { /* ignore */ }
    const params = readUrlParams();
    loadData();
    loadSaved();
    applyTheme();
    updateBadge();
    $('.preview-pill').hidden = !S.preview;
    document.addEventListener('click', onClick);
    document.addEventListener('keydown', onKey);
    document.addEventListener('input', onInput);
    document.addEventListener('change', e => { const f = e.target.form; if (f && f.classList.contains('rq')) rqPersist(f); });
    document.addEventListener('submit', e => { const f = e.target; if (f.classList && f.classList.contains('rq')) { e.preventDefault(); rqSubmit(f); } });
    document.addEventListener('pointerup', onGreetingTap);
    document.addEventListener('pointerdown', () => document.documentElement.classList.remove('kbd'), true);
    window.addEventListener('popstate', () => render(parseRoute(location.hash), { nav: true }));
    window.addEventListener('hashchange', () => { // manual edits of the address bar
        if (location.hash === lastRendered) return;
        if (!(history.state && history.state.ib)) history.replaceState({ ib: 1, idx: histIdx() + 1 }, '', location.hash);
        render(parseRoute(location.hash), { nav: true });
    });
    document.addEventListener('visibilitychange', () => {
        document.documentElement.classList.toggle('doc-hidden', document.hidden);
        if (!document.hidden) { tick(); maybeReshowUpdate(); }
    });
    window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferredInstall = e; S.dirty.add('today'); if (S.view === 'today' && !Overlay.stack.length) renderView('today'); });
    let rT = 0;
    window.addEventListener('resize', () => { clearTimeout(rT); rT = setTimeout(() => {
        if (S.view) observeTitle(S.view);
        const d = $('#ovDetail');
        if (!d.hidden && d.classList.contains('is-open')) { wireDetail(d); heroTo(parseInt($('.dhero', d).dataset.cur || '0', 10), true); }
        const lb = $('#ovLightbox');
        if (!lb.hidden && lb.dataset.cur) lbGoTo(parseInt(lb.dataset.cur, 10), true);
    }, 150); });
    initKeyboardDetect();
    initNetwork();
    initSheetDrag($('#ovDetail'));
    seedHistory();
    render(parseRoute(location.hash), { initial: true });
    setInterval(tick, 60000);
    idle(() => initServiceWorker(params));
}

boot();
