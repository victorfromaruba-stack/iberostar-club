// Client-side password gate. This is a deterrent against casual guest access, not real
// security — anyone who reads this file can see the check and could bypass it via devtools.
// There is no backend, so there is no way to truly authenticate here. To change the password,
// run `crypto.subtle.digest('SHA-256', new TextEncoder().encode('yourNewPassword'))` in a
// browser console, hex-encode the result, and paste it below.
const ADMIN_PASSWORD_HASH = '444d2619acb508ff6c330ea2afeea17139a18cef239bba7b1bd10e415a363753';

async function sha256Hex(text) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function checkPassword() {
    const input = document.getElementById('gatePassword');
    const error = document.getElementById('gateError');
    const hash = await sha256Hex(input.value);
    if (hash === ADMIN_PASSWORD_HASH) {
        sessionStorage.setItem('ib_admin_unlocked', 'true');
        showAdmin();
    } else {
        error.style.display = 'block';
        input.value = '';
        input.focus();
    }
}

function showAdmin() {
    document.getElementById('gateScreen').style.display = 'none';
    document.getElementById('adminContent').classList.add('active');
    loadAppData();
    renderAdminList();
}

let appData = {};
const DATA_VERSION = 306;

function loadAppData() {
    const saved = localStorage.getItem('ib_app_data');
    const savedVersion = localStorage.getItem('ib_data_version');
    if (saved && savedVersion && parseInt(savedVersion, 10) >= DATA_VERSION) {
        try { appData = JSON.parse(saved); } catch (e) { appData = defaultData; }
    } else {
        appData = defaultData;
    }
}

function persistAppData() {
    localStorage.setItem('ib_app_data', JSON.stringify(appData));
    localStorage.setItem('ib_data_version', DATA_VERSION);
}

async function forceOfflineCache() {
    const btn = document.getElementById('preloadBtn');
    const status = document.getElementById('cacheStatus');
    btn.disabled = true;
    status.innerText = "Scanning full database...";

    let allUrls = [];

    const getSwaps = (url) => {
        const arr = [url];
        const decoded = decodeURIComponent(url);
        if (decoded !== url) arr.push(decoded);
        if (url.endsWith('.jpg')) arr.push(url.replace(/\.jpg$/, '.png'));
        if (url.endsWith('.png')) arr.push(url.replace(/\.png$/, '.jpg'));
        return arr;
    };

    Object.values(appData).forEach(item => {
        if (item.gallery) item.gallery.forEach(g => allUrls.push(...getSwaps(g)));
        if (item.partnerLogo) allUrls.push(...getSwaps(item.partnerLogo));
        if (item.pdf) allUrls.push(item.pdf);
        if (item.pdfs) item.pdfs.forEach(p => allUrls.push(p.url));
        if (item.video) allUrls.push(item.video);
    });

    allUrls.push('assets/Logos/logo_club.png');
    allUrls = [...new Set(allUrls)];

    let loaded = 0;
    const total = allUrls.length;
    const cache = await caches.open('ib-aruba-v1');

    status.innerText = `Downloading 0 / ${total}...`;

    const chunkSize = 15;
    for (let i = 0; i < allUrls.length; i += chunkSize) {
        const chunk = allUrls.slice(i, i + chunkSize);
        await Promise.all(chunk.map(async (url) => {
            try {
                await cache.add(url);
            } catch (e) {
                // Silently catch missing individual fallbacks
            } finally {
                loaded++;
            }
        }));
        status.innerText = `Cached ${loaded} / ${total}`;
    }

    status.innerText = "All content (incl. PDFs & videos) cached.";
    btn.disabled = false;
}

async function clearOfflineCache() {
    if ('caches' in window) {
        try {
            await caches.delete('ib-aruba-v1');
            document.getElementById('cacheStatus').innerText = "Cache cleared successfully.";
            showToast("Cache Cleared");
        } catch (e) {
            document.getElementById('cacheStatus').innerText = "Error clearing cache.";
        }
    }
}

function renderAdminList() {
    const listContainer = document.getElementById('itemListContainer');
    listContainer.innerHTML = '';
    const listDiv = document.createElement('div');
    listDiv.style.maxHeight = '300px'; listDiv.style.overflowY = 'auto'; listDiv.style.border = '1px solid rgba(6,18,30,0.1)'; listDiv.style.borderRadius = '16px'; listDiv.style.background = 'white';
    Object.keys(appData).forEach(key => {
        const item = appData[key];
        const div = document.createElement('div');
        div.style.padding = '18px 24px'; div.style.borderBottom = '1px solid rgba(6,18,30,0.05)'; div.style.cursor = 'pointer';
        div.style.display = 'flex'; div.style.justifyContent = 'space-between'; div.style.fontFamily = 'var(--font-body)';
        div.setAttribute('role', 'button');
        div.setAttribute('tabindex', '0');
        div.innerHTML = `<strong style="color:#06121E; font-size:1.05rem;">${item.title}</strong> <span style="color:#8898AA;font-size:13px;font-weight:700;">${key}</span>`;
        div.onclick = () => loadItemIntoForm(key);
        div.onkeydown = (e) => { if (e.key === 'Enter') loadItemIntoForm(key); };
        listDiv.appendChild(div);
    });
    listContainer.appendChild(listDiv);
}

function loadItemIntoForm(key) {
    const item = appData[key];
    document.getElementById('newKey').value = key;
    document.getElementById('newType').value = item.type;
    document.getElementById('newTitle').value = item.title;
    document.getElementById('newSub').value = item.sub;
    document.getElementById('newDesc').value = item.desc;
    document.getElementById('newDuration').value = item.duration || '';
    document.getElementById('newTime').value = item.time || '';
    document.getElementById('newItinerary').value = item.itinerary ? (Array.isArray(item.itinerary) ? item.itinerary.join(', ') : item.itinerary) : '';
    document.getElementById('newEssentials').value = item.essentials ? (Array.isArray(item.essentials) ? item.essentials.join(', ') : item.essentials) : '';
    document.getElementById('newGallery').value = item.gallery ? item.gallery.join(', ') : '';
    document.getElementById('newPartnerLogo').value = item.partnerLogo || '';
    document.getElementById('newFile').value = item.pdf || item.video || '';
}

function clearForm() {
    ['newKey', 'newTitle', 'newSub', 'newDesc', 'newGallery', 'newFile', 'newPartnerLogo',
     'newDuration', 'newTime', 'newItinerary', 'newEssentials'].forEach(id => {
        document.getElementById(id).value = '';
    });
}

function saveItem() {
    const type = document.getElementById('newType').value;
    const title = document.getElementById('newTitle').value;
    const sub = document.getElementById('newSub').value;
    const desc = document.getElementById('newDesc').value;
    const galleryRaw = document.getElementById('newGallery').value;
    const gallery = galleryRaw ? galleryRaw.split(',').map(s => s.trim()).filter(s => s.length > 0) : [];
    const file = document.getElementById('newFile').value;
    const key = document.getElementById('newKey').value;
    const partnerLogo = document.getElementById('newPartnerLogo').value;
    const duration = document.getElementById('newDuration').value;
    const time = document.getElementById('newTime').value;
    const itinRaw = document.getElementById('newItinerary').value;
    const itinerary = itinRaw ? itinRaw.split(',').map(s => s.trim()).filter(s => s.length > 0) : [];
    const essRaw = document.getElementById('newEssentials').value;
    const essentials = essRaw ? essRaw.split(',').map(s => s.trim()).filter(s => s.length > 0) : [];
    if (!key || !title) { alert('ID/Title required'); return; }

    const isVideo = file.toLowerCase().endsWith('.mp4');
    // Items with multiple named menus/brochures (see pdfs on Bucatini/Marea in data.js) aren't
    // editable through this single-file field — preserve that array rather than silently
    // dropping it when the item is re-saved from this form.
    const existingPdfs = appData[key] && appData[key].pdfs;

    appData[key] = {
        type, title, sub, desc, gallery,
        pdf: (!isVideo ? file : ''),
        video: (isVideo ? file : ''),
        partnerLogo: (type === 'fun' ? partnerLogo : ''),
        duration, time, itinerary, essentials,
        ...(existingPdfs ? { pdfs: existingPdfs } : {})
    };
    persistAppData();
    showToast('Changes Saved!');
    renderAdminList();
}

function deleteItem() {
    const key = document.getElementById('newKey').value;
    if (!key) { alert('Select an item first'); return; }
    if (confirm("Delete " + key + "?")) {
        delete appData[key];
        persistAppData();
        showToast('Item Deleted!');
        clearForm();
        renderAdminList();
    }
}

function showToast(msg) {
    const toast = document.getElementById('modeToast');
    toast.innerText = msg;
    toast.style.opacity = '1';
    setTimeout(() => toast.style.opacity = '0', 2500);
}

function exportData() {
    const dataStr = JSON.stringify(appData, null, 4);
    navigator.clipboard.writeText(`const defaultData = ${dataStr};`);
    showToast('Data Copied! Paste it into js/data.js to make it permanent.');
}

window.addEventListener('DOMContentLoaded', () => {
    if (sessionStorage.getItem('ib_admin_unlocked') === 'true') {
        showAdmin();
    } else {
        document.getElementById('gatePassword').focus();
    }
    document.getElementById('gateForm').addEventListener('submit', (e) => {
        e.preventDefault();
        checkPassword();
    });
});
