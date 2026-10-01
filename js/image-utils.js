/* =============================================================================
   js/image-utils.js — device classes + image load/error handling (spec §A.5, §B4.1, §B4.6).
   Loaded first (defer). No inline onerror/onload anywhere: one capture-phase listener on
   `document` handles every <img>, including ones rendered later from template strings.

   Degradation, 3 layers:
     1. No js/media.js (or no entry)  → lib.js imgHTML() already emits the original.
     2. A derivative fails             → retry the same variant once (a Wi-Fi hiccup or roam is far
                                         likelier than a missing file: verify.js checks every variant),
                                         then swap to data-orig, drop srcset/sizes.
     3. The original fails             → jpg↔png / jpeg→jpg / decodeURIComponent retries
                                         (skipped while offline), then triggerFallback()
                                         puts the branded .ph placeholder in the .media box.
   Opt-outs: <img data-noph> is just hidden on failure (logos, brand marks); its parent gets
   .no-img so CSS can show a text wordmark instead.
   ========================================================================== */
(function () {
    const ua = navigator.userAgent || '';
    const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isAndroid = /Android/.test(ua);
    const isTablet = (isIOS && Math.min(screen.width, screen.height) >= 700) || (isAndroid && !/Mobile/.test(ua));
    const isMobile = /Mobi|Android|iPhone|iPod/i.test(ua);
    const c = document.documentElement.classList;
    if (isIOS) c.add('device-ios');
    if (isAndroid) c.add('device-android');
    c.add(isTablet ? 'device-tablet' : isMobile ? 'device-mobile' : 'device-desktop');
})();

const failedImageCache = new Set();

function markImgLoaded(img) {
    img.classList.add('is-loaded');
    // clear the slow-load spinner on the media box and on the detail hero that holds it
    const box = img.closest('.media'), hero = img.closest('.dhero');
    if (box) box.classList.remove('is-slow');
    if (hero) hero.classList.remove('is-slow');
}

/* Kept global (legacy callers). Returns nothing; mutates the element. */
function handleImgLoad(img) {
    if (!img || img.tagName !== 'IMG' || !img.naturalWidth) return;
    markImgLoaded(img);
}

function handleImgError(img) {
    if (!img || img.tagName !== 'IMG' || img.dataset.failed === 'true') return;
    const current = img.currentSrc || img.src || '';
    if (!current || current === location.href) return; // empty src (e.g. data-src slide not yet loaded)

    // Layer 2: a derivative failed. Retry the same variant once after a short pause, or when the
    // connection comes back; the original (up to 10× the bytes) is only the next step.
    const orig = img.dataset.orig;
    const isVariant = orig && img.dataset.stage !== 'orig' && (img.hasAttribute('srcset') || !img.getAttribute('src') || img.getAttribute('src') !== orig);
    if (isVariant && !img.dataset.vretry) {
        img.dataset.vretry = '1';
        const again = () => {
            if (!img.isConnected || img.dataset.stage === 'orig') return;
            // re-setting the attributes (even to the same value) restarts the fetch
            const ss = img.getAttribute('srcset'), src = img.getAttribute('src');
            if (ss) img.setAttribute('srcset', ss);
            if (src) img.setAttribute('src', src);
        };
        if (navigator.onLine === false) window.addEventListener('online', again, { once: true });
        else setTimeout(again, 700);
        return;
    }
    if (isVariant) {
        img.dataset.stage = 'orig';
        img.removeAttribute('srcset');
        img.removeAttribute('sizes');
        img.src = orig;
        return;
    }
    img.dataset.stage = 'orig';

    // Layer 3: the original failed → extension/encoding retries, unless offline.
    // Logos/brand marks (data-noph) skip the retry chain: they just hide and show their text fallback.
    if (img.hasAttribute('data-noph')) { triggerFallback(img); return; }
    const base = img.dataset.retryBase || img.getAttribute('src') || '';
    if (!img.dataset.retryBase) img.dataset.retryBase = base;
    if (failedImageCache.has(base) || navigator.onLine === false) { triggerFallback(img); return; }
    const tries = [
        base.replace(/\.jpg$/i, '.png'),
        base.replace(/\.png$/i, '.jpg'),
        base.replace(/\.jpeg$/i, '.jpg'),
        (() => { try { return decodeURIComponent(base); } catch (e) { return base; } })()
    ].filter((u, i, a) => u !== base && a.indexOf(u) === i);
    const n = parseInt(img.dataset.retries || '0', 10);
    if (n < tries.length) {
        img.dataset.retries = String(n + 1);
        img.src = tries[n];
    } else {
        failedImageCache.add(base);
        triggerFallback(img);
    }
}

/* Final fallback: the designed .ph placeholder (real element, never ::after). */
function triggerFallback(img) {
    img.dataset.failed = 'true';
    img.classList.remove('is-loaded');
    if (img.hasAttribute('data-noph')) {
        img.hidden = true;
        if (img.parentElement) img.parentElement.classList.add('no-img');
        return;
    }
    const box = img.closest('.media');
    if (!box) { img.hidden = true; return; }
    box.classList.remove('is-slow');
    if (box.closest('.photos-grid')) { // gallery thumbnails: drop the tile, no ghost box
        const tile = box.closest('a, button, li');
        if (tile) tile.hidden = true;
        return;
    }
    if (box.querySelector(':scope > .ph')) { img.hidden = true; return; }
    const spec = { name: box.dataset.phName || '', icon: box.dataset.phIcon || '', logo: box.dataset.phLogo || '' };
    const html = typeof phHTML === 'function'
        ? phHTML(spec)
        : '<div class="ph" aria-hidden="true"><div class="ph__stack"><span class="ph__name"></span></div></div>';
    img.hidden = true;
    box.insertAdjacentHTML('beforeend', html);
    if (typeof phHTML !== 'function') { const n = box.querySelector('.ph__name'); if (n) n.textContent = spec.name; }
}

document.addEventListener('load', e => {
    const t = e.target;
    if (t && t.tagName === 'IMG') handleImgLoad(t);
}, true);
document.addEventListener('error', e => {
    const t = e.target;
    if (t && t.tagName === 'IMG') handleImgError(t);
}, true);

/* Viewport-gated loading. Non-eager images are rendered with data-src/data-srcset/data-sizes
   (lib.js imgHTML lazySrc) and only get a real src when they come within ~1 screen of the
   viewport. Native loading=lazy is not enough here: on slow connections Chrome fetches lazy
   images up to 2500px away, so the whole of Today (rails, resorts, spotlight) competed with
   the hero and the first cards for bandwidth (§C.4 LCP budget). Images inside a horizontal
   rail are released together when the rail nears the viewport, so swiping never shows blanks.
   The lightbox and the detail hero carousel manage their own slides (±1) and are skipped. */
function promoteImg(img) {
    if (!img || !img.dataset.src) return;
    if (img.dataset.srcset) { img.srcset = img.dataset.srcset; delete img.dataset.srcset; }
    if (img.dataset.sizes) { img.sizes = img.dataset.sizes; delete img.dataset.sizes; }
    img.src = img.dataset.src;
    delete img.dataset.src;
}
const lazyIO = 'IntersectionObserver' in window ? new IntersectionObserver(entries => entries.forEach(e => {
    if (!e.isIntersecting) return;
    lazyIO.unobserve(e.target);
    if (e.target.tagName === 'IMG') promoteImg(e.target);
    else railLazy(e.target);
}), { rootMargin: '300px 0px' }) : null;
/* A rail near the viewport: release the cards within 1.5 track-widths, the rest as it scrolls. */
function railLazy(track) {
    const imgs = track.querySelectorAll('img[data-src]');
    if (!imgs.length) return;
    if (track._io) track._io.disconnect();
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { io.unobserve(e.target); promoteImg(e.target); } }),
        { root: track, rootMargin: '0px 50% 0px 0px' });
    track._io = io;
    imgs.forEach(i => io.observe(i));
}
/* Before a view re-renders in place: stop observing the nodes it is about to drop (the per-rail
   observers and the shared lazyIO entries), so detached elements are not kept alive. */
function releaseLazy(root) {
    if (!root) return;
    root.querySelectorAll('.rail__track, .saved-strip').forEach(g => {
        if (g._io) { g._io.disconnect(); g._io = null; }
        if (g._lazy && lazyIO) { lazyIO.unobserve(g); g._lazy = 0; }
    });
    if (lazyIO) root.querySelectorAll('img[data-src]').forEach(i => lazyIO.unobserve(i));
}
function observeLazy(root) {
    (root || document).querySelectorAll('img[data-src]').forEach(img => {
        if (img.closest('.lb__track, .dhero__track')) return;
        if (!lazyIO) { promoteImg(img); return; }
        const group = img.closest('.rail__track, .saved-strip');
        if (group) { if (!group._lazy) { group._lazy = 1; lazyIO.observe(group); } return; }
        lazyIO.observe(img);
    });
}

/* Images that finished before this listener existed, or that were inserted already
   complete (memory cache), are swept here. app.js calls it after each render. */
function sweepImages(root) {
    observeLazy(root);
    (root || document).querySelectorAll('img:not(.is-loaded):not([data-failed="true"])').forEach(img => {
        if (!img.complete) return;
        if (img.naturalWidth) markImgLoaded(img);
        else if (img.getAttribute('src')) handleImgError(img);
    });
}
document.addEventListener('DOMContentLoaded', () => sweepImages());
