/* =============================================================================
   js/lib.js — pure helpers for the guest app (spec §A.5, §B.6, §B.7).
   Classic script, loaded with `defer` after image-utils.js, data.js and the
   optional generated media.js, and before app.js. Everything here is a global
   function/const on purpose (no build step). Nothing in this file writes to the
   DOM or to storage: it parses, derives and formats.

   Sections
     1. Escaping + small utils
     2. Time, sun and phase (wraps window.IB_TIME from the inline <head> boot script)
     3. Prices                              parsePrices, priceFrom, fmtPrice, fromText
     4. Duration + slots                    durationShort, slots, slotsLabel, firstSlotShort …
     5. Facets                              area, cuisine, meals, hours/openState, tags,
                                            classifyEssential, channel, status, iberocash …
     6. Facet cache                         buildFacets(appData) → FACETS (Map key → F)
     7. Card meta + facts                   cardMeta, factsOf
     8. Search index + synonyms             searchItems, highlight
     9. Today picks scoring                 todayPicks
    10. Media (derivatives + LQIP)          mediaOf, variantURL, pickW, encodePath, imgHTML, logoImgHTML,
                                            mediaAttrs, phHTML
   ========================================================================== */

/* ---------- 1. Escaping + small utils ---------- */
const ESC_MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ESC_MAP[c]); }
function normText(s) {
    return String(s == null ? '' : s).toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
}
function stripTags(html) { return String(html || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim(); }
function decodeEntities(s) {
    return String(s).replace(/&(amp|lt|gt|quot|#39|nbsp);/g, (m, e) => ({ amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'", nbsp: ' ' }[e]));
}
function plural(n, one, many) { return n + ' ' + (n === 1 ? one : (many || one + 's')); }
function slugify(s) { return normText(s).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }

/* ---------- 2. Time, sun and phase ----------
   The single source of truth is window.IB_TIME, defined by the inline boot script in
   index.html <head> (it must run before first paint to set data-theme). These wrappers
   only add formatting. */
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const PHASES = ['morning', 'day', 'sunset', 'night'];

function ibTime() { return (typeof window !== 'undefined' && window.IB_TIME) || null; }
function arubaNow() {
    const T = ibTime();
    if (T) return T.arubaNow();
    const n = new Date();
    return { y: n.getFullYear(), mo: n.getMonth() + 1, d: n.getDate(), h: n.getHours(), mi: n.getMinutes(),
        wd: n.toLocaleDateString('en-US', { weekday: 'long' }), m: n.getHours() * 60 + n.getMinutes() };
}
function sunTimes(now) {
    const T = ibTime(); now = now || arubaNow();
    return T ? T.sunTimes(now.y, now.mo, now.d) : { rise: 6 * 60 + 30, set: 18 * 60 + 30 };
}
/* → {phase, late, sun, now, theme, override} — reads the same override/theme keys as the boot script */
function phaseInfo() {
    const T = ibTime();
    if (T && T.state) return T.state();
    const now = arubaNow();
    const sun = sunTimes(now);
    const m = now.m;
    const phase = m >= sun.rise - 30 && m < 660 ? 'morning' : m >= 660 && m < sun.set - 75 ? 'day'
        : m >= sun.set - 75 && m < sun.set + 30 ? 'sunset' : 'night';
    return { phase, late: phase === 'night' && (m >= 1380 || m < sun.rise - 30), sun, now, theme: phase === 'morning' || phase === 'day' ? 'light' : 'dark', override: '' };
}
function fmtClock(mins) {
    mins = ((Math.round(mins) % 1440) + 1440) % 1440;
    const h = Math.floor(mins / 60), mm = mins % 60;
    const ap = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return h12 + (mm ? ':' + String(mm).padStart(2, '0') : ':00') + ' ' + ap;
}
/* "4 PM" / "5:30 PM" — drops :00 */
function fmtClockShort(mins) { return fmtClock(mins).replace(':00 ', ' '); }
function fmtCountdown(mins) {
    mins = Math.max(0, Math.round(mins));
    const h = Math.floor(mins / 60), m = mins % 60;
    if (!h) return m + ' min';
    return h + ' h' + (m ? ' ' + m + ' min' : '');
}
function dateEyebrow(now) {
    now = now || arubaNow();
    return `${now.wd}, ${MONTHS[now.mo - 1]} ${now.d}`;
}
function greetingFor(phase) { return phase === 'morning' ? 'Bon dia.' : phase === 'night' ? 'Bon nochi.' : 'Bon tardi.'; }
function contextLine(info) {
    const { phase, late, sun, now } = info;
    if (phase === 'morning') return 'Plan your day in Aruba.';
    if (phase === 'day') {
        const left = sun.set - now.m;
        // only count down inside the real day window (a ?time= preview at another hour shows no countdown)
        return left > 0 && left <= 480 ? `Sunset at ${fmtClock(sun.set)}, in ${fmtCountdown(left)}.` : `Sunset at ${fmtClock(sun.set)}.`;
    }
    if (phase === 'sunset') return `Golden hour now. Sunset at ${fmtClock(sun.set)}.`;
    return late ? 'Plan tomorrow.' : 'Tonight at Iberostar Aruba.';
}
/* Deterministic PRNG for the night starfield (seeded by the Aruba date number). */
function mulberry32(a) {
    return function () {
        a |= 0; a = a + 0x6D2B79F5 | 0;
        let t = Math.imul(a ^ a >>> 15, 1 | a);
        t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
}
function starfieldSVG(now) {
    now = now || arubaNow();
    const rnd = mulberry32(now.y * 10000 + now.mo * 100 + now.d);
    let out = '';
    for (let i = 0; i < 40; i++) {
        const x = (rnd() * 100).toFixed(2), y = (rnd() * 100).toFixed(2);
        const r = (0.6 + rnd() * 0.8).toFixed(2), o = (0.3 + rnd() * 0.6).toFixed(2);
        const tw = i % 5 === 0; // 8 of 40 twinkle
        const dur = (4 + rnd() * 3).toFixed(1), delay = (rnd() * 4).toFixed(1);
        out += `<circle class="star${tw ? ' star--tw' : ''}" cx="${x}%" cy="${y}%" r="${r}" opacity="${o}"${tw ? ` style="--tw-d:${dur}s;--tw-delay:-${delay}s"` : ''}/>`;
    }
    return `<svg class="starfield" aria-hidden="true" focusable="false">${out}</svg>`;
}

/* ---------- 3. Prices ---------- */
const ADDON_LABEL_RE = /^(add-on|optional|extra|each additional)/i;
const CHILD_LABEL_RE = /child|kid/i;

/* → {rows:[{label,text,value}], descHtml (price-box removed)} */
function parsePrices(desc) {
    desc = String(desc || '');
    const toRow = (label, text) => {
        label = decodeEntities(String(label || '')).replace(/\s+/g, ' ').trim();
        text = decodeEntities(String(text || '')).replace(/\s+/g, ' ').trim();
        const v = parseFloat(text.replace(/[^0-9.]/g, ''));
        return { label, text, value: isFinite(v) ? v : null };
    };
    if (typeof document !== 'undefined' && document.createElement) {
        const t = document.createElement('template');
        t.innerHTML = desc;
        const rows = [...t.content.querySelectorAll('.price-row')].map(r => {
            const kids = r.children;
            const l = r.querySelector('span') || kids[0];
            const v = r.querySelector('strong') || kids[kids.length - 1];
            return toRow(l ? l.textContent : '', v && v !== l ? v.textContent : '');
        });
        t.content.querySelectorAll('.price-box').forEach(b => b.remove());
        return { rows, descHtml: t.innerHTML.trim() };
    }
    // No-DOM fallback (node test harness). Mirrors the markup data.js actually uses.
    const rows = [];
    const rowRe = /<div class="price-row">\s*<span>([\s\S]*?)<\/span>\s*<strong>([\s\S]*?)<\/strong>\s*<\/div>/g;
    let m;
    while ((m = rowRe.exec(desc))) rows.push(toRow(stripTags(m[1]), stripTags(m[2])));
    const descHtml = desc.replace(/<div class="price-box">[\s\S]*?<\/div>\s*<\/div>\s*$/, '').replace(/<div class="price-box">(?:\s*<div class="price-row">[\s\S]*?<\/div>)*\s*<\/div>/g, '').trim();
    return { rows, descHtml };
}
function isAddOnRow(r) { return ADDON_LABEL_RE.test(r.label); }
/* → {value, perHour, label} | null */
function priceFrom(item, rows) {
    if (item && typeof item.priceFrom === 'number' && isFinite(item.priceFrom)) return { value: item.priceFrom, perHour: false, label: '' };
    rows = rows || parsePrices(item && item.desc).rows;
    let c = rows.filter(r => r.value != null && !isAddOnRow(r));
    const adults = c.filter(r => !CHILD_LABEL_RE.test(r.label));
    if (adults.length) c = adults;
    if (!c.length) return null;
    let best = c[0];
    c.forEach(r => { if (r.value < best.value) best = r; });
    return { value: best.value, perHour: /per hour/i.test(best.label), label: best.label };
}
function fmtPrice(n) {
    if (n == null || !isFinite(n)) return '';
    const whole = Math.abs(n % 1) < 0.005;
    return '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: whole ? 0 : 2, maximumFractionDigits: whole ? 0 : 2 });
}
function fromText(pf) { return pf ? fmtPrice(pf.value) + (pf.perHour ? '/hr' : '') : ''; }

/* ---------- 4. Duration + slots ---------- */
const DUR_RE = /(\d+(?:\.\d+)?)(?:\s*(-|–|or)\s*(\d+(?:\.\d+)?))?\s*(hours?|hrs?|minutes?|mins?)/i;
/* "4 Hours"→"4 h", "5-7 Hours"→"5–7 h", "4 or 8 Hours"→"4 or 8 h", "50 Minutes"→"50 min" */
function durationShort(s) {
    const m = DUR_RE.exec(String(s || ''));
    if (!m) return { text: s ? String(s) : '', maxHours: null, minutes: null };
    const isMin = /^m/i.test(m[4]);
    const u = isMin ? 'min' : 'h';
    const a = parseFloat(m[1]), b = m[3] ? parseFloat(m[3]) : null;
    const sep = m[2] ? (/or/i.test(m[2]) ? ' or ' : '–') : '';
    const text = b != null ? `${a}${sep}${b} ${u}` : `${a} ${u}`;
    const max = b != null ? b : a;
    return { text, maxHours: isMin ? max / 60 : max, minutes: isMin ? a : null };
}

const TIME_TOKEN_RE = /(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)?/gi;
/* Parses "4:00 PM – 7:00 PM", "2:30–6:30 PM", "7am - 2pm", "9:00 AM", "17:00" → {start,end|null} minutes, or null */
function parseTimeRange(str) {
    const s = String(str || '').replace(/\([^)]*\)/g, ' ');
    const toks = [];
    let m;
    TIME_TOKEN_RE.lastIndex = 0;
    while ((m = TIME_TOKEN_RE.exec(s))) {
        const h = +m[1], mm = m[2] ? +m[2] : 0;
        if (!m[2] && !m[3]) continue;          // a bare number ("up to 6") is not a time
        if (h > 24 || mm > 59) continue;
        toks.push({ h, mm, ap: m[3] ? m[3][0].toLowerCase() : '', i: m.index, end: m.index + m[0].length });
        if (toks.length === 2) break;
    }
    if (!toks.length) return null;
    const toMin = (t, ap) => {
        let h = t.h;
        if (ap === 'p' && h < 12) h += 12;
        if (ap === 'a' && h === 12) h = 0;
        return h * 60 + t.mm;
    };
    const a = toks[0];
    let b = toks[1];
    if (b) {
        const between = s.slice(a.end, b.i);
        if (!/^\s*(?:-|–|—|to)\s*$/i.test(between)) b = null;
    }
    if (!b) return a.ap || a.mm || /:/.test(s) ? { start: toMin(a, a.ap), end: null } : null;
    let apA = a.ap, apB = b.ap;
    if (!apA && apB) {
        apA = apB;
        if (toMin(a, apA) > toMin(b, apB)) apA = apB === 'p' ? 'a' : 'p';
    }
    return { start: toMin(a, apA), end: toMin(b, apB || apA) };
}
/* {start,end} → "4–7 PM" / "9:30 AM–1:30 PM" / "5:30 PM" */
function fmtRangeShort(r) {
    if (!r) return '';
    if (r.end == null) return fmtClockShort(r.start);
    const A = fmtClockShort(r.start), B = fmtClockShort(r.end);
    const apA = A.slice(-2), apB = B.slice(-2);
    return apA === apB ? `${A.slice(0, -3)}–${B}` : `${A}–${B}`;
}
/* "Label: value | value or value" → [{label, value, range, short}] */
function slots(time) {
    if (time == null || time === '') return [];
    return String(time).split(/\s*\|\s*|\s+or\s+/i).map(s => s.trim()).filter(Boolean).map(s => {
        const m = /^([A-Za-z][A-Za-z &]*?)\s*:\s*(.+)$/.exec(s);
        const label = m ? m[1].trim() : '';
        const value = m ? m[2].trim() : s;
        const range = parseTimeRange(value);
        const paren = (/\(([^)]*)\)/.exec(value) || [])[1] || '';
        return { label, value, range, short: range ? fmtRangeShort(range) : '', note: paren };
    });
}
function slotsLabel(item, sl) {
    sl = sl || slots(item.time);
    if (item.type === 'golf') return 'Tee times';
    if (sl.some(s => /pickup/i.test(s.label))) return 'Pickup';
    return sl.length === 1 ? 'Departs' : 'Sessions';
}
function firstSlotShort(sl) {
    const s = sl.find(x => x.short);
    return s ? s.short : '';
}
function slotStartMinutes(sl) {
    const s = sl.find(x => x.range);
    return s ? s.range.start : null;
}
/* One-line slot summary for cards: "4–7 PM", "9 AM or 3 PM", "2 sessions" */
function slotSummary(sl) {
    if (!sl.length) return '';
    if (sl.length === 1) return sl[0].short || '';
    const pick = sl.filter(s => !/pickup/i.test(s.label));
    if (pick.length === 1 && pick[0].short) return pick[0].short;
    if (sl.length === 2 && sl.every(s => s.range)) return sl.map(s => fmtClockShort(s.range.start)).join(' or ');
    return plural(sl.length, 'session');
}
/* Facts cell value for the slot column */
function slotFact(item, sl) {
    const label = slotsLabel(item, sl);
    if (!sl.length) return null;
    if (label === 'Pickup') {
        const p = sl.find(s => /pickup/i.test(s.label)) || sl[0];
        return { dt: 'Pickup', dd: p.short || p.value };
    }
    if (label === 'Tee times') return { dt: label, dd: sl[0].short || sl[0].value };
    if (sl.length === 1) {
        const s = sl[0];
        return { dt: label, dd: s.short || s.value.replace(/\s*departures?$/i, '') };
    }
    return { dt: label, dd: plural(sl.length, 'option') };
}

/* ---------- 5. Facets ---------- */
const AREAS = {
    joia: { label: 'At Iberostar Joia', short: 'At Joia' },
    tierra: { label: 'Tierra del Sol', short: 'Tierra del Sol' },
    partner: { label: 'Partner restaurant', short: 'Off-site' },
    island: { label: 'Island-wide', short: 'Island-wide' }
};
function area(item) {
    if (item.area && AREAS[item.area]) return item.area;
    const sub = String(item.sub || '');
    if (/joia/i.test(sub)) return 'joia';
    if (/tierra/i.test(sub)) return 'tierra';
    if (item.type === 'food') return 'partner';
    if (item.type === 'fun') return 'island';
    return '';
}
function areaLabel(a) { return AREAS[a] ? AREAS[a].label : ''; }
function areaShort(a) { return AREAS[a] ? AREAS[a].short : ''; }

function cuisine(item) {
    if (item.cuisine) return String(item.cuisine);
    if (item.type !== 'food') return '';
    const sub = String(item.sub || '');
    const c = sub.includes('•') ? sub.split('•').slice(1).join('•').trim() : sub.trim();
    // A sub that only names a place ("Tierra del Sol") is not a cuisine.
    if (/^(joia|tierra|iberostar)/i.test(c) || /tierra del sol/i.test(c)) return '';
    return c;
}

const MEAL_NAMES = ['breakfast', 'lunch', 'dinner', 'drinks'];
const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const HOURS_RE = /^(?:(\w[\w &]*?)\s+)?(?:(\d{1,2}:\d{2})-(\d{1,2}:\d{2})|from\s+(\d{1,2}:\d{2}))(?:\s+(Mon|Tue|Wed|Thu|Fri|Sat|Sun)(?:-(Mon|Tue|Wed|Thu|Fri|Sat|Sun))?)?$/;
function hhmm(s) { const [h, m] = s.split(':').map(Number); return h * 60 + m; }
/* → [{raw, ok, label, open, close, from, d1, d2}] */
function hours(item) {
    const list = Array.isArray(item.hours) ? item.hours : [];
    return list.filter(x => typeof x === 'string' && x.trim()).map(raw => {
        const m = HOURS_RE.exec(raw.trim());
        if (!m) return { raw, ok: false };
        return {
            raw, ok: true, label: m[1] || '',
            open: m[2] ? hhmm(m[2]) : m[4] ? hhmm(m[4]) : null,
            close: m[3] ? hhmm(m[3]) : null,
            from: !!m[4], d1: m[5] || '', d2: m[6] || m[5] || ''
        };
    });
}
function mealFromLabel(l) {
    l = String(l || '').toLowerCase();
    if (l === 'brunch') return 'breakfast';
    if (l === 'bar' || l === 'cocktails') return 'drinks';
    return MEAL_NAMES.includes(l) ? l : '';
}
/* → {list, derived:boolean} */
function mealsInfo(item) {
    if (item.type !== 'food') return { list: [], derived: false };
    let list, derived = false;
    if (Array.isArray(item.meals) && item.meals.length) list = item.meals.filter(m => MEAL_NAMES.includes(m));
    else {
        derived = true;
        const c = cuisine(item) + ' ' + (item.sub || '');
        const td = (item.title || '') + ' ' + stripTags(item.desc);
        if (/\bbar\b|rooftop/i.test(c)) list = ['drinks'];
        else if (/bagel|breakfast|brunch/i.test(td)) list = ['breakfast', 'lunch'];
        else list = ['dinner'];
    }
    hours(item).forEach(h => { const ml = h.ok && mealFromLabel(h.label); if (ml && !list.includes(ml)) list.push(ml); });
    return { list: MEAL_NAMES.filter(m => list.includes(m)), derived };
}
function meals(item) { return mealsInfo(item).list; }

function dayIdx(wd) { return DAY_NAMES.indexOf(String(wd || '').slice(0, 3)); }
function lineAppliesOn(h, di) {
    if (!h.d1) return true;
    const a = dayIdx(h.d1), b = dayIdx(h.d2);
    if (a < 0) return true;
    return a <= b ? di >= a && di <= b : di >= a || di <= b;
}
/* → {state:'open'|'closing'|'opens'|'closed'|'from'|'unknown', until, next, label, text} */
function openState(item, now) {
    const hs = hours(item).filter(h => h.ok);
    if (!hs.length) return { state: 'unknown', text: '' };
    now = now || arubaNow();
    const di = dayIdx(now.wd), prev = (di + 6) % 7, m = now.m;
    let openUntil = null, nextOpen = null, fromLine = null;
    hs.forEach(h => {
        const mealLabel = h.label && !/^daily$/i.test(h.label) ? h.label : '';
        if (h.from) {
            if (lineAppliesOn(h, di)) {
                if (m >= h.open) { if (!fromLine || fromLine.open > h.open) fromLine = h; }
                else if (nextOpen == null || h.open < nextOpen.open) nextOpen = { open: h.open, label: mealLabel, from: true };
            }
            return;
        }
        const overnight = h.close <= h.open;
        if (lineAppliesOn(h, di)) {
            if (m >= h.open && (overnight || m < h.close)) {
                const until = overnight ? h.close + 1440 : h.close;
                if (openUntil == null || until > openUntil) openUntil = until;
            } else if (m < h.open && (nextOpen == null || h.open < nextOpen.open)) nextOpen = { open: h.open, label: mealLabel };
        }
        if (overnight && lineAppliesOn(h, prev) && m < h.close) {
            if (openUntil == null || h.close > openUntil) openUntil = h.close;
        }
    });
    if (openUntil != null) {
        const left = openUntil - m;
        if (left <= 45) return { state: 'closing', until: openUntil, text: `Closes soon · ${fmtClock(openUntil)}` };
        return { state: 'open', until: openUntil, text: `Open now · until ${fmtClockShort(openUntil)}` };
    }
    if (fromLine) {
        const lbl = fromLine.label && !/^daily$/i.test(fromLine.label) ? fromLine.label : 'Open';
        return { state: 'from', text: `${lbl} from ${fmtClockShort(fromLine.open)}` };
    }
    if (nextOpen) {
        if (nextOpen.from) return { state: 'from', next: nextOpen.open, text: `${nextOpen.label || 'Open'} from ${fmtClockShort(nextOpen.open)}` };
        return { state: 'opens', next: nextOpen.open, text: `Opens ${fmtClockShort(nextOpen.open)}` };
    }
    return { state: 'closed', text: 'Closed today' };
}
function hasParsedHours(item) { return hours(item).some(h => h.ok); }

function isPrivateText(t) { return /\bprivate\b/i.test(t.replace(/non-private|not private/gi, '')); }
/* → string[] (item.tags ∪ derived) */
function tagsOf(item, ctx) {
    ctx = ctx || {};
    const set = new Set(Array.isArray(item.tags) ? item.tags.map(t => String(t).toLowerCase()) : []);
    const td = (item.title || '') + ' ' + (ctx.descText != null ? ctx.descText : stripTags(parsePrices(item.desc).descHtml));
    const rows = ctx.rows || parsePrices(item.desc).rows;
    const t = item.type;
    if (/sunset/i.test(td)) set.add('sunset');
    const water = /sail|catamaran|snorkel|boat|cruise|shipwreck/i.test(td);
    if (t === 'fun' || t === 'golf') {
        if (water) set.add('water');
        if (/snorkel/i.test(td)) set.add('snorkel');
        if (/utv|atv|jeep|off-road|kart/i.test(td)) set.add('offroad');
        if (/island|natural pool|lighthouse|cave|bus|safari/i.test(td) && !water) set.add('island');
        if (isPrivateText(td)) set.add('private');
        if (rows.some(r => CHILD_LABEL_RE.test(r.label))) set.add('kids');
        if (t === 'fun' && /dinner/i.test(td)) set.add('dinner');
    }
    if (t === 'golf') set.add('golf');
    if (t === 'store') set.add('shop');
    const dur = ctx.dur || durationShort(item.duration);
    if (dur.maxHours != null && (t === 'fun' || t === 'golf')) {
        if (dur.maxHours <= 4.5) set.add('halfday');
        if (dur.maxHours >= 5) set.add('fullday');
    }
    const pf = ctx.pf !== undefined ? ctx.pf : priceFrom(item, rows);
    if (pf && pf.value < 100) set.add('under100');
    return [...set];
}

const ESSENTIAL_GROUPS = ['bring', 'included', 'addons', 'info'];
function classifyEssential(s) {
    s = String(s || '');
    if (/^optional|^\+\s?\$|add-on/i.test(s)) return 'addons';
    if (/\b(included|provided)\b/i.test(s)) return 'included';
    if (/notify|required|must|minimum|license|accompanied|arrive|age\b|private charter/i.test(s)) return 'info';
    return 'bring';
}
function essentialGroupTitle(g, item) {
    return { bring: item && item.type === 'golf' ? 'Dress & bring' : 'Bring', included: 'Included', addons: 'Add-ons', info: 'Good to know' }[g];
}

function channel(item) {
    if (item.channel === 'in-house' || item.channel === 'off-site' || item.channel === 'both') return item.channel;
    const sub = String(item.sub || '');
    if (/red sail/i.test(sub)) return 'in-house';
    if (/rocka/i.test(sub)) return 'off-site';
    return 'both';
}
function visibleInMode(item, inHouse) {
    const c = channel(item);
    return c === 'both' || c === (inHouse ? 'in-house' : 'off-site');
}
function status(item) {
    if (item.status === 'coming-soon') return 'coming-soon';
    if (/coming soon|in development/i.test(String(item.sub || ''))) return 'coming-soon';
    return '';
}
function statusLabel(item) { return /in development/i.test(String(item.sub || '')) ? 'In development' : 'Coming soon'; }
function iberocash(item) {
    if (typeof item.iberocash === 'boolean') return item.iberocash;
    return item.type !== 'club' && status(item) !== 'coming-soon' && !/complimentary/i.test(String(item.sub || ''));
}
function partnerName(item) { return String(item.sub || '').split(' • ')[0].trim(); }
function partnerShort(item) {
    let p = partnerName(item);
    for (let i = 0; i < 2; i++) p = p.replace(/\s+(tours|aruba)$/i, '');
    return p;
}
function isComplimentary(item) { return /complimentary/i.test(String(item.sub || '') + ' ' + String(item.title || '')); }
/* "Swedish Massage (50min)" → "Swedish Massage" for display where duration is shown separately */
function cleanTitle(item) { return String(item.title || '').replace(/\s*\(\s*\d+\s*min\w*\s*\)\s*$/i, ''); }
/* short=true for card eyebrows (narrow columns): "Sunset" instead of "Sunset sail" */
function funCategory(F, short) {
    const t = new Set(F.tags), title = F.item.title || '';
    if (/rental/i.test(title)) return 'Rental';
    if (/kart/i.test(title)) return 'Karting';
    if (t.has('water')) return t.has('sunset') ? (short ? 'Sunset' : 'Sunset sail') : t.has('snorkel') ? (short ? 'Snorkel' : 'Snorkel sail') : 'Sailing';
    if (t.has('offroad')) return /jeep/i.test(title) ? (short ? 'Jeep' : 'Jeep safari') : 'Off-road';
    if (t.has('island')) return short ? 'Island' : 'Island tour';
    return 'Tour';
}
function menusOf(item) {
    const out = [];
    if (Array.isArray(item.pdfs)) item.pdfs.forEach(p => { if (p && p.url) out.push({ label: p.label || '', url: p.url }); });
    if (item.pdf && !out.some(p => p.url === item.pdf)) out.unshift({ label: '', url: item.pdf });
    return out.map(p => ({ url: p.url, label: p.label || (item.type === 'food' ? 'Menu' : 'Brochure') }));
}

/* ---------- 6. Facet cache ---------- */
const FACETS = new Map();
/* F = {key, item, idx, rows, descHtml, descText, from, dur, slots, area, cuisine, meals, mealsDerived,
        hours, tags, channel, status, iberocash, partner, menus, onProperty, search:{fields}} */
function makeFacets(key, item, idx) {
    const { rows, descHtml } = parsePrices(item.desc);
    const descText = stripTags(descHtml);
    const dur = durationShort(item.duration);
    const sl = slots(item.time);
    const pf = priceFrom(item, rows);
    const a = area(item);
    const mi = mealsInfo(item);
    const F = {
        key, item, idx, rows, descHtml, descText, from: pf, dur, slots: sl,
        area: a, cuisine: cuisine(item), meals: mi.list, mealsDerived: mi.derived,
        hours: hours(item), channel: channel(item), status: status(item), iberocash: iberocash(item),
        partner: partnerName(item), menus: menusOf(item),
        onProperty: a === 'joia' || a === 'tierra'
    };
    F.tags = tagsOf(item, { rows, descText, dur, pf });
    F.search = buildSearchFields(F);
    return F;
}
function buildFacets(data) {
    FACETS.clear();
    Object.keys(data).forEach((k, i) => FACETS.set(k, makeFacets(k, data[k], i)));
    return FACETS;
}
function facet(key) { return FACETS.get(key) || null; }

/* ---------- 7. Card meta + facts ---------- */
/* → {eyebrow, meta (html), price (html|''), status (openState|null)} — values are already escaped HTML */
function cardMeta(F) {
    const it = F.item, t = it.type;
    const out = { eyebrow: '', meta: '', price: '', status: null };
    if (t === 'food') {
        // the area part is wrapped so grouped Dine (whose group heading already names the area) can hide it
        const a = areaShort(F.area);
        out.eyebrow = a && F.cuisine ? `<span class="eb-area">${esc(a)} · </span>${esc(F.cuisine)}` : esc(a || F.cuisine || '');
        const parts = [];
        if (F.meals.length) parts.push(F.meals.map(m => m === 'drinks' ? 'Drinks' : m[0].toUpperCase() + m.slice(1)).join(' · '));
        if (F.menus.length) parts.push(F.menus.length === 1 ? 'Menu' : F.menus.length + ' menus');
        out.meta = esc(parts.join(' · '));
        if (F.hours.some(h => h.ok)) out.status = openState(it);
    } else if (t === 'fun') {
        out.eyebrow = esc(partnerShort(it) + ' · ' + funCategory(F, true));
        const bits = [F.dur.text, slotSummary(F.slots)].filter(Boolean);
        out.meta = bits.length ? `<svg class="ic ic--meta" aria-hidden="true"><use href="#i-clock"/></svg>${esc(bits.join(' · '))}` : '';
        if (F.from) out.price = `<span class="from">From</span> <b>${esc(fromText(F.from))}</b>`;
    } else if (t === 'spa') {
        out.eyebrow = esc(areaShort(F.area) || 'Spa Sensations');
        out.meta = isComplimentary(it) ? esc('Complimentary' + (F.dur.text ? ' · ' + F.dur.text : '')) : 'Treatments &amp; rituals';
    } else if (t === 'golf') {
        out.eyebrow = esc(areaShort(F.area) || 'Golf & nature');
        const tee = F.slots[0] && F.slots[0].short;
        out.meta = esc(tee ? 'Tee times ' + tee : it.sub || '');
    } else {
        out.eyebrow = esc(t === 'club' ? 'Iberostar in Aruba' : 'Shopping');
        out.meta = esc(it.sub || '');
    }
    if (F.status === 'coming-soon') out.eyebrow = esc(statusLabel(it));
    return out;
}
/* → [{dt, dd}] per §B4.10 (empty cells skipped) */
function factsOf(F) {
    const it = F.item, t = it.type, out = [];
    const add = (dt, dd) => { if (dd) out.push({ dt, dd: String(dd) }); };
    if (t === 'fun') {
        add('Duration', F.dur.text);
        const sf = slotFact(it, F.slots); if (sf) add(sf.dt, sf.dd);
        if (F.from) add('From', fromText(F.from));
    } else if (t === 'food') {
        add('Cuisine', F.cuisine);
        add('Where', areaShort(F.area)); // short form fits a 3-up strip at 390px; the eyebrow carries the full label
        const hl = F.hours.filter(h => h.ok);
        if (F.menus.length) add('Menus', F.menus.length === 1 ? '1 menu' : F.menus.length + ' menus');
        else if (hl.length) add('Hours', openState(it).text);
    } else if (t === 'spa') {
        add('Duration', F.dur.text);
        add('Price', isComplimentary(it) ? 'Complimentary' : F.from ? 'From ' + fromText(F.from) : '');
        add('Where', areaShort(F.area) || '');
    } else if (t === 'golf') {
        add('Duration', F.dur.text);
        const sf = slotFact(it, F.slots); if (sf) add(sf.dt, sf.dd);
        add('Where', areaShort(F.area));
    } else if (t === 'club') {
        add('Location', it.sub && F.status !== 'coming-soon' ? it.sub : '');
        add('Status', F.status === 'coming-soon' ? statusLabel(it) : 'Open');
        if (it.video) add('Video', 'Video tour');
    } else if (t === 'store') {
        add('Type', F.status === 'coming-soon' ? statusLabel(it) : it.sub);
    }
    return out;
}

/* ---------- 8. Search index + synonyms ---------- */
const STOPWORDS = new Set(['the', 'a', 'an', 'at', 'in', 'for', 'with', 'near', 'tonight', 'today', 'and', 'of', 'to', 'on']);
const SYN = (() => {
    const map = {};
    const add = (words, exp) => words.forEach(w => { map[w] = (map[w] || []).concat(exp); });
    add(['dinner', 'supper', 'evening'], ['dinner']);
    add(['breakfast', 'brunch', 'morning'], ['breakfast']);
    add(['lunch'], ['lunch']);
    add(['drinks', 'drink', 'bar', 'cocktail', 'cocktails', 'wine', 'rooftop'], ['drinks']);
    add(['boat', 'catamaran', 'cruise', 'yacht', 'sailing', 'sail'], ['sail', 'catamaran', 'cruise']);
    add(['snorkel', 'snorkeling', 'snorkelling', 'reef', 'shipwreck'], ['snorkel']);
    add(['jeep', 'utv', 'atv', '4x4', 'offroad', 'off-road', 'safari', 'buggy', 'kart', 'karting'], ['offroad']);
    add(['massage', 'spa', 'wellness', 'facial', 'treatment'], ['spa', 'massage']);
    add(['kids', 'kid', 'child', 'children', 'family'], ['kids']);
    add(['pizza'], ['pizzeria']);
    add(['sushi', 'asian', 'japanese', 'thai'], ['asian']);
    add(['steak', 'steakhouse', 'bbq', 'grill'], ['steak', 'grill']);
    add(['seafood', 'fish', 'lobster'], ['seafood', 'lobster']);
    add(['pasta'], ['italian']);
    add(['shop', 'shopping', 'store', 'gift', 'gifts', 'souvenir', 'souvenirs', 'sunscreen', 'aloe'], ['shop', 'aloe']);
    add(['tee', 'golfing'], ['golf']);
    add(['sunset'], ['sunset']);
    return map;
})();
const TYPE_WORDS = { food: 'restaurant dining food eat', fun: 'tour activity excursion', spa: 'spa wellness', golf: 'golf nature', store: 'shop shopping store', club: 'hotel resort' };
function buildSearchFields(F) {
    const it = F.item;
    const facetsTxt = [...F.tags, ...F.meals, F.area, TYPE_WORDS[it.type] || ''].join(' ');
    const lists = [].concat(it.itinerary || [], it.essentials || [], F.rows.map(r => r.label));
    return [
        { w: 5, t: normText(it.title) },
        { w: 4, t: normText(facetsTxt) },
        { w: 3, t: normText([it.sub, F.cuisine, areaLabel(F.area)].join(' ')) },
        { w: 2, t: normText(lists.join(' ')) },
        { w: 1, t: normText(F.descText) }
    ];
}
function queryTokens(q) {
    let s = normText(q).replace(/golden hour/g, 'sunset').replace(/off road/g, 'offroad').replace(/[^a-z0-9\-\s]/g, ' ');
    return s.split(/\s+/).filter(t => t && !STOPWORDS.has(t));
}
function wordStartRe(term, whole) {
    return new RegExp('(^|[^a-z0-9])' + term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + (whole ? '(?![a-z0-9])' : ''));
}
/* strict = synonym expansion: short synonyms ("spa") must match a whole word so they do not hit
   "Spanish"/"Spaghetti", and synonyms never get the substring half-score. */
function termScore(fields, term, strict) {
    let best = 0;
    const re = wordStartRe(term, strict && term.length < 4);
    for (const f of fields) {
        if (!f.t) continue;
        let s = 0;
        if (re.test(f.t)) s = f.w; else if (!strict && term.length >= 3 && f.t.includes(term)) s = f.w / 2;
        if (s > best) best = s;
    }
    return best;
}
/* → [{key, score}] sorted; opts {inHouse, keys (restrict), includeHidden} */
function searchItems(q, opts) {
    opts = opts || {};
    const toks = queryTokens(q);
    if (!toks.length) return [];
    const out = [];
    const keys = opts.keys || [...FACETS.keys()];
    keys.forEach(k => {
        const F = FACETS.get(k);
        if (!F) return;
        if (!opts.includeHidden && !visibleInMode(F.item, !!opts.inHouse)) return;
        let total = 0;
        for (const tok of toks) {
            // The literal word outranks its synonyms ("steak" → Daniel's before the grill).
            let best = termScore(F.search, tok);
            (SYN[tok] || []).forEach(a => { if (a === tok) return; const s = termScore(F.search, a, true) * 0.8; if (s > best) best = s; });
            if (!best) return;
            total += best;
        }
        out.push({ key: k, score: total });
    });
    out.sort((a, b) => {
        const A = FACETS.get(a.key), B = FACETS.get(b.key);
        const cs = (A.status === 'coming-soon') - (B.status === 'coming-soon');
        if (cs) return cs;
        if (b.score !== a.score) return b.score - a.score;
        if (A.onProperty !== B.onProperty) return A.onProperty ? -1 : 1;
        return A.idx - B.idx;
    });
    return out;
}
/* Wrap query/synonym word-prefix matches in <mark>; returns escaped HTML. */
function highlight(text, q) {
    text = String(text || '');
    const toks = queryTokens(q);
    if (!toks.length) return esc(text);
    const terms = new Set();
    toks.forEach(t => { terms.add(t); (SYN[t] || []).forEach(s => terms.add(s)); });
    // Normalise char-by-char so indices line up with the original string.
    let norm = '';
    for (const ch of text) { const n = normText(ch); norm += n.length === 1 ? n : (n[0] || ' '); }
    if (norm.length !== text.length) return esc(text);
    const marks = new Array(text.length).fill(false);
    terms.forEach(t => {
        if (!t) return;
        let i = norm.indexOf(t);
        while (i !== -1) {
            if (i === 0 || !/[a-z0-9]/.test(norm[i - 1])) for (let j = i; j < i + t.length; j++) marks[j] = true;
            i = norm.indexOf(t, i + 1);
        }
    });
    let out = '', open = false;
    for (let i = 0; i < text.length; i++) {
        if (marks[i] && !open) { out += '<mark>'; open = true; }
        if (!marks[i] && open) { out += '</mark>'; open = false; }
        out += esc(text[i]);
    }
    return out + (open ? '</mark>' : '');
}

/* ---------- 9. Today picks scoring (§B6.5) ---------- */
function isSpaLike(F) { return F.item.type === 'spa'; }
/* → [{key, score, reason}] ; info = phaseInfo() */
function todayPicks(info, opts) {
    opts = opts || {};
    const phase = info.phase, late = !!info.late, now = info.now || arubaNow(), sun = info.sun || sunTimes(now);
    const mode = phase === 'night' && late ? 'morning' : phase; // "late" plans tomorrow morning
    const scored = [];
    FACETS.forEach(F => {
        const it = F.item;
        if (it.type === 'club' || F.status === 'coming-soon' || !visibleInMode(it, !!opts.inHouse)) return;
        const tags = new Set(F.tags), meals = new Set(F.meals);
        const fired = []; // [weight, reason]
        let s = 0;
        const hit = (w, reason) => { s += w; fired.push([w, reason]); };
        // the next departure still ahead today (planning tomorrow → the first one)
        const starts = F.slots.filter(x => x.range).map(x => x.range.start).sort((a, b) => a - b);
        const ahead = late ? starts : starts.filter(m => m >= now.m);
        const start = ahead.length ? ahead[0] : starts.length ? starts[0] : null;
        if (Array.isArray(it.featured) && it.featured.includes(phase)) {
            hit(10, phase === 'sunset' ? `Best at sunset · ${fmtClock(sun.set)}` : phase === 'morning' ? 'Best in the morning' : phase === 'day' ? 'Great this afternoon' : 'Tonight’s pick');
        }
        const tee = it.type === 'golf' && F.slots[0] && F.slots[0].short ? 'Tee times ' + F.slots[0].short : '';
        const departs = tee || (start != null ? `Departs ${fmtClock(start)}` : '');
        // The "at Joia" bonus is about where to eat/drink; it should not push the spa into night picks.
        const joiaBonus = F.area === 'joia' && it.type !== 'spa';
        const where = areaShort(F.area);
        if (mode === 'morning') {
            if (meals.has('breakfast')) hit(6, 'Breakfast' + (where ? ' · ' + where : ''));
            if (start != null && start < 660) hit(4, departs);
            if (tags.has('snorkel') || tags.has('water')) hit(2, departs || 'On the water');
            if (isSpaLike(F)) hit(3, isComplimentary(it) ? 'Complimentary' : 'Spa Sensations');
            if (it.type === 'golf') hit(2, F.slots[0] && F.slots[0].short ? 'Tee times ' + F.slots[0].short : 'Golf & nature');
        } else if (mode === 'day') {
            if (meals.has('lunch')) hit(3, 'Lunch' + (where ? ' · ' + where : ''));
            if (tags.has('water')) hit(4, departs || 'On the water');
            if (tags.has('island')) hit(3, departs || 'Island tour');
            if (isSpaLike(F)) hit(3, isComplimentary(it) ? 'Complimentary' : 'Spa Sensations');
            if (it.type === 'golf') hit(2, F.slots[0] && F.slots[0].short ? 'Tee times ' + F.slots[0].short : 'Golf & nature');
        } else if (mode === 'sunset') {
            if (tags.has('sunset')) hit(8, `Best at sunset · ${fmtClock(sun.set)}`);
            if (meals.has('drinks')) hit(5, 'Drinks' + (where ? ' · ' + where : ''));
            if (meals.has('dinner')) hit(4, 'Dinner' + (where ? ' · ' + where : ''));
            if (joiaBonus) hit(1, 'At Joia');
        } else { // night
            if (meals.has('dinner')) hit(6, 'Dinner' + (where ? ' · ' + where : ''));
            if (meals.has('drinks')) hit(5, 'Drinks' + (where ? ' · ' + where : ''));
            if (joiaBonus) hit(2, 'At Joia');
        }
        // Fixed departures that have all left today are not a pick (unless planning tomorrow).
        if (!late && starts.length && !ahead.length) s -= 100;
        if (s > 0) {
            fired.sort((a, b) => b[0] - a[0]);
            scored.push({ key: F.key, score: s, reason: (fired.find(f => f[1]) || [0, ''])[1], idx: F.idx, type: it.type });
        }
    });
    scored.sort((a, b) => b.score - a.score || a.idx - b.idx);
    const perType = {}, out = [];
    for (const p of scored) {
        if (out.length >= 6) break;
        perType[p.type] = (perType[p.type] || 0) + 1;
        if (perType[p.type] > 3) continue;
        out.push({ key: p.key, score: p.score, reason: p.reason });
    }
    if (out.length < 3) {
        const pad = [];
        if (FACETS.has('SpaPromo')) pad.push('SpaPromo');
        FACETS.forEach(F => { if (F.item.type === 'food' && F.area === 'joia') pad.push(F.key); });
        for (const k of pad) {
            if (out.length >= 3) break;
            if (out.some(o => o.key === k)) continue;
            const F = FACETS.get(k);
            out.push({ key: k, score: 0, reason: isComplimentary(F.item) ? 'Complimentary' : areaShort(F.area) || '' });
        }
    }
    return out;
}

/* ---------- 10. Media (§A.5) ----------
   js/media.js is generated by scripts/build-images.py and may be missing (404). Every
   helper degrades to the original file. Keys in MEDIA.img are paths exactly as written
   in data.js (unencoded). */
const HAS_MEDIA = typeof MEDIA !== 'undefined' && !!MEDIA && !!MEDIA.img;
function mediaOf(src) { return HAS_MEDIA && src ? MEDIA.img[src] || null : null; }
function variantURL(m, w) { return `assets/img/${m.id}-${w}.webp`; }
function pickW(m, want) { const f = m.v.find(x => x >= want); return f != null ? f : m.v[m.v.length - 1]; }
function encodePath(p) { return String(p || '').split('/').map(encodeURIComponent).join('/'); }
/* Inline custom properties for the .media wrapper: style="--lqip:url(…);--dom:#…" (or '') */
function mediaAttrs(src, extra) {
    const m = mediaOf(src);
    const parts = extra ? [extra] : [];
    if (!m) return parts.length ? ` style="${parts.join(';')}"` : '';
    if (m.q && /^data:image\/[a-z]+;base64,[A-Za-z0-9+/=]+$/.test(m.q)) parts.push(`--lqip:url('${m.q}')`);
    if (m.c && /^#[0-9a-f]{3,8}$/i.test(m.c)) parts.push(`--dom:${m.c}`);
    return parts.length ? ` style="${parts.join(';')}"` : '';
}
/* imgHTML(src, {widths:[480,800], sizes, eager=false, priority=false, alt='', cls='', lazySrc=false}) → string */
function imgHTML(src, o) {
    o = o || {};
    const widths = o.widths || [480, 800];
    const alt = esc(o.alt || '');
    const cls = o.cls ? ` class="${esc(o.cls)}"` : '';
    const orig = encodePath(src);
    const loading = o.eager ? 'eager' : 'lazy';
    const prio = o.eager && o.priority ? ' fetchpriority="high"' : '';
    const srcAttr = o.lazySrc ? 'data-src' : 'src';
    const m = mediaOf(src);
    if (!m || !Array.isArray(m.v) || !m.v.length) {
        return `<img${cls} ${srcAttr}="${orig}" alt="${alt}" loading="${loading}"${prio} decoding="async" data-orig="${orig}">`;
    }
    const ws = [...new Set(widths.map(w => pickW(m, w)))].sort((a, b) => a - b);
    const mainW = pickW(m, widths.includes(800) ? 800 : widths[widths.length - 1]);
    const srcset = ws.map(w => `${variantURL(m, w)} ${w}w`).join(', ');
    const sizes = o.sizes ? ` ${o.lazySrc ? 'data-sizes' : 'sizes'}="${esc(o.sizes)}"` : '';
    const dim = m.w && m.h ? ` width="${m.w}" height="${m.h}"` : '';
    return `<img${cls} ${srcAttr}="${variantURL(m, mainW)}" ${o.lazySrc ? 'data-srcset' : 'srcset'}="${srcset}"${sizes}${dim} alt="${alt}" loading="${loading}"${prio} decoding="async" data-orig="${orig}">`;
}
/* Logo <img> (detail lockup, placeholder tile, partner footer): the 160/320w WebP derivatives
   plus the original at its native width as the top srcset candidate, so a 72px tile loads a few KB
   while a wide lockup on a 3× screen can still pick the sharp original. data-noph: a failed logo
   hides itself instead of inserting a placeholder. */
function logoImgHTML(src, o) {
    o = o || {};
    const alt = esc(o.alt || ''), orig = encodePath(src), m = mediaOf(src);
    const lazy = o.eager ? 'eager' : 'lazy';
    if (!m || !Array.isArray(m.v) || !m.v.length) return `<img src="${orig}" alt="${alt}" loading="${lazy}" decoding="async" data-noph data-orig="${orig}">`;
    const set = m.v.map(w => `${variantURL(m, w)} ${w}w`);
    if (m.w && m.w > m.v[m.v.length - 1]) set.push(`${orig} ${m.w}w`);
    // o.box = [maxW, maxH] of the contain box → the slot width the logo really renders at
    const sizes = o.box && m.w && m.h ? Math.max(16, Math.round(Math.min(o.box[0], o.box[1] * m.w / m.h))) + 'px' : (o.sizes || '72px');
    return `<img src="${variantURL(m, m.v[0])}" srcset="${set.join(', ')}" sizes="${esc(sizes)}" alt="${alt}" loading="${lazy}" decoding="async" data-noph data-orig="${orig}">`;
}
/* Placeholder (§B4.6). name/icon/logo/chip are plain strings; returns HTML. */
function phHTML(o) {
    o = o || {};
    const icon = o.logo
        ? `<span class="ph__logo">${logoImgHTML(o.logo, { box: [56, 56] })}</span>`
        : o.icon ? `<svg class="ph__icon" aria-hidden="true"><use href="#i-${esc(o.icon)}"/></svg>` : '';
    return `<div class="ph" aria-hidden="true">`
        + `<svg class="ph__waves" viewBox="0 0 400 100" preserveAspectRatio="none" aria-hidden="true">`
        + `<path d="M0 30 C 60 10, 120 50, 200 30 S 340 10, 400 30"/><path d="M0 55 C 70 35, 130 75, 200 55 S 330 35, 400 55"/><path d="M0 80 C 60 62, 140 98, 200 80 S 340 62, 400 80"/></svg>`
        + `<div class="ph__stack">${icon}${o.name ? `<span class="ph__name">${esc(o.name)}</span>` : ''}${o.chip ? `<span class="ph__chip">${esc(o.chip)}</span>` : ''}</div></div>`;
}
/* Placeholder spec for an item: fun → partner name + sail icon; store → bag; club → star */
function phSpecFor(F) {
    const it = F.item;
    const icon = it.type === 'fun' ? 'sail' : it.type === 'store' ? 'bag' : it.type === 'club' ? 'star' : it.type === 'spa' ? 'spa' : it.type === 'food' ? 'dine' : 'star';
    return {
        name: it.type === 'fun' ? partnerName(it) || it.title : cleanTitle(it),
        icon, logo: it.logo || '',
        chip: F.status === 'coming-soon' ? statusLabel(it) : ''
    };
}

/* node test harness hook (no effect in the browser) */
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { esc, parsePrices, priceFrom, fmtPrice, fromText, durationShort, slots, slotsLabel, firstSlotShort, slotSummary, slotFact,
        slotStartMinutes, parseTimeRange, fmtRangeShort, area, cuisine, meals, mealsInfo, hours, openState, tagsOf, classifyEssential, channel,
        visibleInMode, status, iberocash, partnerName, partnerShort, funCategory, menusOf, buildFacets, facet, FACETS, cardMeta, factsOf,
        searchItems, highlight, todayPicks, phaseInfo, arubaNow, sunTimes, fmtClock, contextLine, dateEyebrow, greetingFor, starfieldSVG,
        mediaOf, variantURL, pickW, encodePath, imgHTML, logoImgHTML, mediaAttrs, phHTML, cleanTitle };
}
