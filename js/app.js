        function handleKeyboard(isOpen) {
            if(document.documentElement.classList.contains('device-mobile')) {
                if(isOpen) document.body.classList.add('keyboard-open');
                else setTimeout(() => document.body.classList.remove('keyboard-open'), 100);
            }
        }

        function clearSearch() {
            const input = document.getElementById('searchInput');
            input.value = '';
            filterContent();
            input.focus();
        }

        // --- GESTURE SWIPE DOWN ENGINE (Polished for absolute stability) ---
        let dragStartY = 0;
        let dragCurrentY = 0;
        const modalEl = document.querySelector('.modal');
        const modalScrollEl = document.getElementById('modalContentScroll');

        const resetModalTouch = () => {
            dragStartY = 0; 
            dragCurrentY = 0;
            modalEl.style.transition = 'transform 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.1)';
            modalEl.style.transform = '';
        };

        modalEl.addEventListener('touchstart', e => {
            if(e.target.closest('.modal-close-btn') || e.target.closest('.gallery-scroller') || e.target.closest('button')) return;
            dragStartY = e.touches[0].clientY;
            modalEl.style.transition = 'none'; 
        }, {passive: false});

        modalEl.addEventListener('touchmove', e => {
            if(dragStartY === 0) return;
            dragCurrentY = e.touches[0].clientY;
            const diff = dragCurrentY - dragStartY;
            
            if(diff > 0 && modalScrollEl.scrollTop <= 0) {
                const frictionDiff = diff * 0.85; 
                modalEl.style.transform = `translateY(${frictionDiff}px) scale(1)`;
            }
        }, {passive: true});

        modalEl.addEventListener('touchend', e => {
            if(dragStartY === 0) return;
            const diff = dragCurrentY - dragStartY;
            
            if(diff > 120 && modalScrollEl.scrollTop <= 0) {
                closeModal();
                setTimeout(resetModalTouch, 600); 
            } else {
                resetModalTouch(); 
            }
        }, {passive: true});

        modalEl.addEventListener('touchcancel', resetModalTouch, {passive: true});

        let appData = {};
        let currentSection = 'portfolio';
        let timeState = 0; 
        let currentGallery = [];
        let currentImgIndex = 0;
        let inHouseMode = localStorage.getItem('ib_in_house') === 'true';
        let fsVideoTimeoutId = null;
        let currentPdfBlobUrl = null;
        
        // Bump whenever js/data.js's schema or paths change, to flush stale localStorage copies.
        const DATA_VERSION = 309;

        window.onload = function() {
            const saved = localStorage.getItem('ib_app_data');
            const savedVersion = localStorage.getItem('ib_data_version');

            if(saved && savedVersion && parseInt(savedVersion) >= DATA_VERSION) { 
                try { appData = JSON.parse(saved); } catch(e) { appData = defaultData; } 
            } else { 
                appData = defaultData; 
                localStorage.setItem('ib_app_data', JSON.stringify(appData));
                localStorage.setItem('ib_data_version', DATA_VERSION);
            }
            
            updateTimeVibe();
            
            setTimeout(() => { 
                const splash = document.getElementById('splash');
                splash.style.opacity = '0'; 
                setTimeout(() => splash.style.display = 'none', 500); 
            }, 800);
            renderApp('portfolio');
            
            let ticking = false;
            document.addEventListener('mousemove', (e) => {
                if (!ticking && !document.documentElement.classList.contains('device-mobile')) { 
                    window.requestAnimationFrame(() => { handleTilt(e); ticking = false; }); 
                    ticking = true; 
                }
            });
            
            document.addEventListener('keydown', (e) => {
                if(document.getElementById('fsViewer').style.display === 'flex' || document.getElementById('fsViewer').classList.contains('active')) {
                    if(e.key === 'ArrowLeft') prevFs();
                    if(e.key === 'ArrowRight') nextFs();
                    if(e.key === 'Escape') closeFs();
                } else if(document.getElementById('detailModal').classList.contains('active')) {
                    if(e.key === 'Escape') closeModal();
                }
            });

            let titleTaps = 0;
            let titleTapResetId = null;
            document.getElementById('pageTitle').addEventListener('click', function() {
                titleTaps++;
                if (titleTapResetId) clearTimeout(titleTapResetId);
                if(titleTaps === 3) {
                    inHouseMode = !inHouseMode;
                    localStorage.setItem('ib_in_house', inHouseMode);
                    showToast(inHouseMode ? "Mode: In-House Only" : "Mode: Full Off-Site");

                    if (currentSection === 'activities') {
                        renderApp('activities');
                    }
                    titleTaps = 0;
                } else {
                    titleTapResetId = setTimeout(() => { titleTaps = 0; titleTapResetId = null; }, 1500);
                }
            });
        };
        

        function toggleTimeMode() {
            timeState++;
            if(timeState > 4) timeState = 0;
            updateTimeVibe();
            const modes = ["Auto Mode", "Morning Mode", "Day Mode", "Sunset Mode", "Night Mode"];
            showToast(modes[timeState]);
        }

        function updateTimeVibe() {
            const hour = new Date().getHours();
            const root = document.documentElement;
            const body = document.body;
            const els = ['boat', 'fish', 'birds', 'dolphin', 'stars', 'nightGlow', 'clouds', 'fireflies', 'palmShadows'];
            
            els.forEach(id => {
                const el = document.getElementById(id);
                if(el) el.className = el.className.split(' ')[0];
            }); 
            
            body.classList.remove('night-mode', 'dark-theme');
            
            const logo = document.getElementById('headerLogo');
            if(logo) logo.classList.remove('logo-white');

            let phase = 'day';
            if (timeState === 0) { 
                if(hour >= 5 && hour < 11) phase = 'morning';
                else if(hour >= 11 && hour < 17) phase = 'day';
                else if(hour >= 17 && hour < 19) phase = 'sunset';
                else phase = 'night';
            } else {
                const phases = ['', 'morning', 'day', 'sunset', 'night'];
                phase = phases[timeState];
            }

            if(phase === 'morning') {
                document.getElementById('greeting').innerText = "Bon Dia";
                root.style.setProperty('--bg-gradient-1', '#9ED2F6'); root.style.setProperty('--bg-gradient-2', '#F9F7E8');
                document.getElementById('birds').classList.add('birds-active');
                document.getElementById('fish').classList.add('fish-active');
                document.getElementById('clouds').classList.add('clouds-active');
                document.getElementById('palmShadows').classList.add('shadows-active');
            } else if(phase === 'day') {
                document.getElementById('greeting').innerText = "Bon Tardi";
                root.style.setProperty('--bg-gradient-1', '#6db3f2'); root.style.setProperty('--bg-gradient-2', '#1a7ec4');
                document.getElementById('birds').classList.add('birds-active');
                document.getElementById('fish').classList.add('fish-active');
                document.getElementById('dolphin').classList.add('dolphin-active');
                document.getElementById('clouds').classList.add('clouds-active');
                document.getElementById('palmShadows').classList.add('shadows-active');
            } else if(phase === 'sunset') {
                document.getElementById('greeting').innerText = "Bon Tardi";
                body.classList.add('dark-theme');
                root.style.setProperty('--bg-gradient-1', '#355C7D'); root.style.setProperty('--bg-gradient-2', '#C56D54');
                document.getElementById('boat').classList.add('boat-active'); 
                document.getElementById('dolphin').classList.add('dolphin-active');
                document.getElementById('nightGlow').classList.add('glow-active');
                if(logo) logo.classList.add('logo-white'); 
            } else { 
                document.getElementById('greeting').innerText = "Bon Nochi";
                body.classList.add('night-mode', 'dark-theme');
                root.style.setProperty('--bg-gradient-1', '#06121E'); root.style.setProperty('--bg-gradient-2', '#162b44');
                document.getElementById('boat').classList.add('boat-active');
                document.getElementById('stars').classList.add('stars-active');
                document.getElementById('nightGlow').classList.add('glow-active');
                document.getElementById('fireflies').classList.add('fireflies-active');
                if(logo) logo.classList.add('logo-white'); 
            }
            const options = { weekday: 'long', month: 'long', day: 'numeric' };
            document.getElementById('dateDisplay').innerText = new Date().toLocaleDateString('en-US', options);
        }

        function handleTilt(e) {
            const cards = document.querySelectorAll('.card');
            cards.forEach(card => {
                const rect = card.getBoundingClientRect();
                const x = e.clientX - rect.left; const y = e.clientY - rect.top;
                if(x > 0 && x < rect.width && y > 0 && y < rect.height) {
                    const centerX = rect.width / 2; const centerY = rect.height / 2;
                    const rotateX = ((y - centerY) / centerY) * -4; const rotateY = ((x - centerX) / centerX) * 4;
                    card.style.transform = `perspective(1200px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.03)`;
                } else {
                    card.style.transform = 'perspective(1200px) rotateX(0) rotateY(0) scale(1)';
                }
            });
        }

        function renderApp(sectionId) {
            currentSection = sectionId;
            const container = document.getElementById('appContent');
            const h1 = document.getElementById('pageTitle');
            const sub = document.getElementById('pageSub');
            const searchBox = document.getElementById('searchBox');
            const searchInput = document.getElementById('searchInput');
            
            document.getElementById('mainContainer').scrollTop = 0;
            
            const noResults = document.createElement('div'); 
            noResults.className = 'no-results'; 
            noResults.innerText = "No experiences found.";
            noResults.style.display = 'none';
            
            if (sectionId === 'dining' || sectionId === 'activities' || sectionId === 'store') searchBox.style.display = 'block'; else searchBox.style.display = 'none';
            searchInput.value = '';
            document.getElementById('searchClear').classList.remove('active');

            if(sectionId === 'portfolio') { h1.setAttribute('data-text', "Iberostar Aruba"); h1.innerText = "Iberostar Aruba"; sub.innerText = "Experience the ultimate Iberostar hotels on Aruba."; } 
            else if(sectionId === 'dining') { h1.setAttribute('data-text', "Taste"); h1.innerText = "Taste"; sub.innerText = "Culinary journeys from Joia to the island's best."; } 
            else if(sectionId === 'activities') { h1.setAttribute('data-text', "Discover"); h1.innerText = "Discover"; sub.innerText = "Thrill and adventure with our official tour partners."; }
            else if(sectionId === 'spa') { h1.setAttribute('data-text', "Wellness"); h1.innerText = "Wellness"; sub.innerText = "Rejuvenate your body and mind at Spa Sensations."; }
            else if(sectionId === 'golf') { h1.setAttribute('data-text', "Golf & Nature"); h1.innerText = "Golf & Nature"; sub.innerText = "Championship golf and bird sanctuary tours."; }
            else if(sectionId === 'store') { h1.setAttribute('data-text', "Shopping"); h1.innerText = "Shopping"; sub.innerText = "Exclusive retail partners and local treasures."; }

            let html = `<div class="grid fade-wrapper">`;
            
            const filterMap = { 'portfolio': 'club', 'dining': 'food', 'activities': 'fun', 'spa': 'spa', 'golf': 'golf', 'store': 'store' };
            const type = filterMap[sectionId];
            
            let itemsToShow = Object.keys(appData).map(key => ({ key, ...appData[key] })).filter(i => i.type === type);
            
            if (type === 'fun') {
                if (inHouseMode) {
                    itemsToShow = itemsToShow.filter(i => i.sub && i.sub.toLowerCase().includes('red sail'));
                } else {
                    itemsToShow = itemsToShow.filter(i => i.sub && i.sub.toLowerCase().includes('rocka'));
                }
            }
            
            itemsToShow.forEach((item, index) => {
                let logoHtml = ''; if(item.partnerLogo) logoHtml = `<img src="${item.partnerLogo}" class="partner-badge" alt="${item.sub} logo" onerror="this.style.display='none'">`;
                const mainImg = item.gallery && item.gallery[0];

                // A package can have both a menu/brochure PDF and a video tour; show a badge
                // for each rather than letting one hide the other.
                let mediaBadge = '';
                if(item.video) {
                    const safeVid = item.video.replace(/'/g, "\\'");
                    mediaBadge += `<div class="media-badge" role="button" tabindex="0" aria-label="Play video tour" onclick="event.stopPropagation(); viewVideo('${safeVid}')" onkeydown="if(event.key==='Enter'){event.stopPropagation(); viewVideo('${safeVid}')}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg></div>`;
                }
                if(item.pdf || (item.pdfs && item.pdfs.length)) {
                    const safePdf = (item.pdf || item.pdfs[0].url).replace(/'/g, "\\'");
                    const secondaryClass = item.video ? ' secondary' : '';
                    mediaBadge += `<div class="media-badge${secondaryClass}" role="button" tabindex="0" aria-label="View brochure PDF" onclick="event.stopPropagation(); viewPdf('${safePdf}')" onkeydown="if(event.key==='Enter'){event.stopPropagation(); viewPdf('${safePdf}')}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg></div>`;
                }

                const cashBadgeHtml = item.type !== 'club' ? '<div class="cash-badge">IBEROCASH</div>' : '';
                const cleanDesc = item.desc.replace(/<[^>]*>?/gm, '');
                const delay = index * 0.05;

                const imgLoadingParams = index < 6 ? 'fetchpriority="high"' : 'loading="lazy" decoding="async"';
                const safeKey = item.key.replace(/'/g, "\\'");

                const mediaHtml = mainImg
                    ? `<div class="card-img-blur" style="background-image: url('${mainImg}')"></div>
                        ${logoHtml} ${mediaBadge}
                        <div class="tag-pill ${item.sub.includes('Joia') || item.sub.includes('Exclusive') ? 'highlight' : ''}">${item.sub}</div>
                        ${cashBadgeHtml}
                        <div class="card-img-wrapper">
                            <img src="${mainImg}" alt="${item.title}" onerror="handleImgError(this)" ${imgLoadingParams}>
                        </div>`
                    : `${logoHtml} ${mediaBadge}
                        <div class="tag-pill ${item.sub.includes('Joia') || item.sub.includes('Exclusive') ? 'highlight' : ''}">${item.sub}</div>
                        ${cashBadgeHtml}`;

                html += `<div class="card" onclick="openDetails('${safeKey}')" role="button" tabindex="0" aria-label="${item.title}" onkeydown="if(event.key==='Enter'){openDetails('${safeKey}')}" style="animation-delay: ${delay}s">
                    <div class="card-media ${mainImg ? '' : 'card-fallback'}">
                        ${mediaHtml}
                    </div>
                    <div class="card-content">
                        <h3 class="card-title">${item.title}</h3>
                        <p class="card-desc">${cleanDesc.substring(0, 90)}...</p>
                        <span class="hidden-search-data" style="display:none;">${item.desc} ${item.sub}</span>
                    </div>
                </div>`;
            });
            html += `</div>`;

            container.innerHTML = html;
            const gridEl = container.querySelector('.grid');
            gridEl.appendChild(noResults);
            // Sparse sections (1-2 items) otherwise leave empty grid tracks trailing off to the
            // right; cap the columns to the real item count so the grid doesn't look abandoned.
            if (itemsToShow.length > 0 && itemsToShow.length <= 2) {
                gridEl.classList.add('grid-sparse');
                // auto-fit (not a fixed repeat count) lets the track count itself collapse to
                // one column on narrow viewports instead of forcing N columns that overflow
                // the screen and get clipped by main's overflow-x: hidden.
                gridEl.style.gridTemplateColumns = 'repeat(auto-fit, minmax(270px, 380px))';
            }

            document.querySelectorAll('.nav-btn').forEach(b => { b.classList.remove('active'); b.removeAttribute('aria-current'); });
            const navMap = { 'portfolio': 'nav-club', 'dining': 'nav-dining', 'activities': 'nav-fun', 'spa': 'nav-spa', 'golf': 'nav-golf', 'store': 'nav-store' };
            const activeId = navMap[sectionId];
            if(activeId) {
                const activeBtn = document.getElementById(activeId);
                activeBtn.classList.add('active');
                activeBtn.setAttribute('aria-current', 'page');
            }
        }

        function nav(id) {
            if (id === currentSection) return;
            const container = document.getElementById('appContent');
            container.classList.add('section-leaving');
            setTimeout(() => {
                renderApp(id);
                container.classList.remove('section-leaving');
            }, 160);
        }

        function filterContent() {
            const input = document.getElementById('searchInput');
            const query = input.value.toLowerCase();
            const clearBtn = document.getElementById('searchClear');
            const noRes = document.querySelector('.no-results');
            
            if(query.length > 0) clearBtn.classList.add('active');
            else clearBtn.classList.remove('active');

            const cards = document.querySelectorAll('.card');
            let visibleCount = 0;
            cards.forEach(card => {
                const title = card.querySelector('.card-title').innerText.toLowerCase();
                const sub = card.querySelector('.tag-pill').innerText.toLowerCase();
                const hiddenDesc = card.querySelector('.hidden-search-data').innerText.toLowerCase();
                
                if(title.includes(query) || sub.includes(query) || hiddenDesc.includes(query)) { 
                    card.style.display = 'block'; 
                    card.style.animation = 'none'; 
                    card.style.transform = 'translateY(0) scale(1)';
                    visibleCount++; 
                } else { 
                    card.style.display = 'none'; 
                }
            });
            
            if(visibleCount === 0) noRes.style.display = 'block'; else noRes.style.display = 'none';
        }

        let lastFocusedEl = null;

        function openDetails(key) {
            const item = appData[key];
            const modal = document.getElementById('detailModal');
            const mainImg = document.getElementById('dImg');
            lastFocusedEl = document.activeElement;

            document.getElementById('dGallery').innerHTML = '';
            document.getElementById('modalContentScroll').scrollTop = 0;
            
            mainImg.setAttribute('data-retries', '0');
            mainImg.dataset.failed = 'false';
            mainImg._isFailed = false;
            mainImg.parentElement.classList.remove('hero-fallback');

            const spinner = modal.querySelector('.image-spinner');

            const galleryData = item.gallery || [];
            currentGallery = galleryData;

            if(galleryData.length > 0) {
                 spinner.classList.add('active');
                 mainImg.alt = item.title;
                 mainImg.src = galleryData[0];
                 mainImg.style.display = 'block';
                 if(mainImg.complete) handleImgLoad(mainImg);
            } else {
                 spinner.classList.remove('active');
                 mainImg.style.display = 'none';
                 mainImg.parentElement.classList.add('hero-fallback');
            }

            document.getElementById('dTitle').innerText = item.title;
            document.getElementById('dSub').innerText = item.sub;
            document.getElementById('dDesc').innerHTML = item.desc;

            const grid = document.getElementById('dInfoGrid');
            grid.innerHTML = '';
            if(item.duration) grid.innerHTML += `<div class="info-item"><h5>Duration</h5><p>${item.duration}</p></div>`;
            if(item.time) grid.innerHTML += `<div class="info-item"><h5>Departure</h5><p>${item.time}</p></div>`;
            
            const detailsDiv = document.getElementById('dDetails');
            detailsDiv.innerHTML = '';
            if(item.itinerary || item.essentials) {
                let detHtml = '';
                if(item.itinerary && item.itinerary.length > 0) {
                    detHtml += `<h4>Tour Highlights</h4><ul class="details-list">`;
                    const stops = Array.isArray(item.itinerary) ? item.itinerary : item.itinerary.split(',');
                    stops.forEach(s => detHtml += `<li>${s.trim()}</li>`);
                    detHtml += `</ul>`;
                }
                if(item.essentials && item.essentials.length > 0) {
                    detHtml += `<h4 style="margin-top:30px;">What to Bring</h4><ul class="details-list">`;
                    const pack = Array.isArray(item.essentials) ? item.essentials : item.essentials.split(',');
                    pack.forEach(s => detHtml += `<li>${s.trim()}</li>`);
                    detHtml += `</ul>`;
                }
                detailsDiv.innerHTML = detHtml;
            }

            const actBar = document.getElementById('dAction');
            let actionButtons = '';
            let hasPrimary = false;

            if(item.pdfs && item.pdfs.length) {
                item.pdfs.forEach(p => {
                    const safePdf = p.url.replace(/'/g, "\\'");
                    const safeLabel = p.label.replace(/</g, "&lt;");
                    actionButtons += `<button class="btn-big ${!hasPrimary ? 'btn-primary' : ''}" onclick="viewPdf('${safePdf}')"><svg viewBox="0 0 24 24"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg> ${safeLabel}</button>`;
                    hasPrimary = true;
                });
            } else if(item.pdf) {
                const safePdf = item.pdf.replace(/'/g, "\\'");
                actionButtons += `<button class="btn-big ${!hasPrimary ? 'btn-primary' : ''}" onclick="viewPdf('${safePdf}')"><svg viewBox="0 0 24 24"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg> View Brochure</button>`;
                hasPrimary = true;
            }
            if(item.video) {
                const safeVid = item.video.replace(/'/g, "\\'");
                actionButtons += `<button class="btn-big ${!hasPrimary ? 'btn-primary' : ''}" onclick="viewVideo('${safeVid}')"><svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg> Video Tour</button>`;
                hasPrimary = true;
            }
            
            const safeKey = key.replace(/'/g, "\\'");
            actionButtons += `<button class="btn-big" style="flex:0; min-width:80px;" onclick="sharePackage('${safeKey}')" title="Share" aria-label="Share"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92-1.31-2.92-2.92-2.92z"/></svg></button>`;

            actBar.innerHTML = actionButtons;

            modal.style.transform = '';
            modal.classList.add('active');
            document.getElementById('modalCloseBtn').focus();

            const galHeading = document.getElementById('dGalleryHeading');
            if (galHeading) galHeading.style.display = galleryData.length > 0 ? '' : 'none';

            setTimeout(() => {
                const gal = document.getElementById('dGallery');
                const fragment = document.createDocumentFragment();

                galleryData.forEach((img, i) => {
                    const div = document.createElement('div');
                    div.className = 'gallery-item';
                    div.setAttribute('role', 'button');
                    div.setAttribute('tabindex', '0');
                    div.setAttribute('aria-label', `View photo ${i + 1} of ${galleryData.length}`);
                    div.onclick = function() { openLightboxFromThumb(this); };
                    div.onkeydown = function(e) { if (e.key === 'Enter') openLightboxFromThumb(this); };

                    const image = document.createElement('img');
                    image.src = img;
                    image.alt = `${item.title} photo ${i + 1}`;
                    image.decoding = 'async';
                    image.onerror = function() { handleImgError(this); };
                    image.onload = function() { handleImgLoad(this); };

                    div.appendChild(image);
                    fragment.appendChild(div);
                });

                requestAnimationFrame(() => {
                    gal.innerHTML = '';
                    gal.appendChild(fragment);
                    gal.style.opacity = '0';
                    requestAnimationFrame(() => gal.style.opacity = '1');
                });
            }, 450);
        }
        
        async function sharePackage(key) {
            const item = appData[key];
            const cleanText = item.desc.replace(/<[^>]*>?/gm, '').substring(0, 150);
            
            if (navigator.share) {
                try {
                    await navigator.share({
                        title: item.title,
                        text: `Check out ${item.title} - ${item.sub}\n\n${cleanText}...`,
                        url: window.location.href 
                    });
                } catch (err) { console.log('Share canceled'); }
            } else {
                try {
                    await navigator.clipboard.writeText(`Check out ${item.title} - ${item.sub}\n\n${cleanText}...`);
                    showToast("Details copied to clipboard!");
                } catch (e) {
                    showToast("Sharing not supported");
                }
            }
        }

        let isClosingModal = false;
        function closeModal(e) { 
            if(e) { e.preventDefault(); e.stopPropagation(); }
            if (isClosingModal) return;
            isClosingModal = true;
            
            const modal = document.querySelector('.modal');
            modal.style.transform = 'translateY(100vh) scale(0.95)';
            document.getElementById('detailModal').classList.remove('active');
            if (lastFocusedEl && lastFocusedEl.focus) lastFocusedEl.focus();

            setTimeout(() => {
                modal.style.transform = ''; 
                isClosingModal = false;
            }, 500);
        }

        function getValidImages() {
            const validImgs = [];
            const thumbs = document.querySelectorAll('#dGallery .gallery-item img');
            thumbs.forEach(img => {
                if (img.style.display !== 'none' && img.parentElement.style.display !== 'none') {
                    validImgs.push(img.src);
                }
            });
            return validImgs;
        }

        function openLightboxFromThumb(element) {
            const imgSrc = element.querySelector('img').src;
            const validList = getValidImages();
            let index = validList.indexOf(imgSrc);
            if (index === -1) index = 0;
            launchLightbox(validList, index);
        }

        function launchLightbox(list, index) {
            if (list.length === 0) return;
            lastFocusedEl = document.activeElement;
            currentGallery = list;
            currentImgIndex = index;
            const fs = document.getElementById('fsViewer');
            const prevBtn = document.getElementById('fsPrev');
            const nextBtn = document.getElementById('fsNext');
            const caption = document.getElementById('fsCaption');
            prevBtn.style.display = list.length > 1 ? 'flex' : 'none';
            nextBtn.style.display = list.length > 1 ? 'flex' : 'none';
            caption.style.display = list.length > 1 ? 'block' : 'none';
            updateFsImage();
            fs.classList.add('active');
            document.querySelector('.fs-close').focus();
        }

        function updateFsImage() {
            const src = currentGallery[currentImgIndex];
            const content = document.getElementById('fsContent');
            const caption = document.getElementById('fsCaption');
            const backdrop = document.getElementById('fsBackdrop');
            content.innerHTML = `<img class="fs-image" src="${src}" alt="Photo ${currentImgIndex + 1} of ${currentGallery.length}" onerror="handleImgError(this)">`;
            backdrop.style.backgroundImage = `url('${src}')`;
            caption.innerText = `${currentImgIndex + 1} / ${currentGallery.length}`;
        }

        function nextFs() { currentImgIndex++; if(currentImgIndex >= currentGallery.length) currentImgIndex = 0; updateFsImage(); }
        function prevFs() { currentImgIndex--; if(currentImgIndex < 0) currentImgIndex = currentGallery.length - 1; updateFsImage(); }

        async function viewPdf(url) {
            const fs = document.getElementById('fsViewer');
            const content = document.getElementById('fsContent');
            
            document.getElementById('fsPrev').style.display = 'none';
            document.getElementById('fsNext').style.display = 'none';
            document.getElementById('fsCaption').style.display = 'none';
            document.getElementById('fsBackdrop').style.backgroundImage = 'none'; 
            
            if (currentPdfBlobUrl) { URL.revokeObjectURL(currentPdfBlobUrl); currentPdfBlobUrl = null; }

            let finalUrl = url;

            if ('caches' in window) {
                try {
                    const cache = await caches.open('ib-aruba-v1');
                    const response = await cache.match(url);
                    if (response) {
                        const blob = await response.blob();
                        finalUrl = URL.createObjectURL(blob);
                        currentPdfBlobUrl = finalUrl;
                    }
                } catch(e) { console.log("Cache miss for PDF"); }
            }

            content.innerHTML = `
                <div style="width:100%; height:100%; overflow-y:auto; -webkit-overflow-scrolling:touch; background:#06121E; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; padding: 30px;">
                    <svg viewBox="0 0 24 24" style="width:70px;height:70px;fill:var(--gold);margin-bottom:20px;"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>
                    <h2 style="color:white; font-family:var(--font-head); font-size:2.4rem; margin:0 0 10px 0; font-weight:700;">Brochure Ready</h2>
                    <p style="color:#8898AA; font-family:var(--font-body); font-size:1.1rem; max-width:400px; margin:0 0 40px 0; font-weight:500;">For the highest quality reading experience, tap below to open the official document fullscreen.</p>
                    <div style="display:flex; gap:15px; flex-direction:column; width:100%; max-width:300px;">
                        <a href="${finalUrl}" target="_blank" style="background:var(--gold); padding:20px; border-radius:20px; color:#06121E; text-decoration:none; font-weight:800; box-shadow:0 12px 30px rgba(212,175,55,0.3); font-family:var(--font-body); font-size:1.1rem; letter-spacing:1px;">OPEN BROCHURE</a>
                        <button onclick="closeFs()" style="background:rgba(255,255,255,0.1); border:1px solid rgba(255,255,255,0.2); padding:20px; border-radius:20px; color:white; font-weight:800; box-shadow:0 12px 30px rgba(0,0,0,0.3); font-family:var(--font-body); font-size:1.1rem; letter-spacing:1px; cursor:pointer;">GO BACK</button>
                    </div>
                </div>`;
            fs.classList.add('active');
        }

        function viewVideo(url) {
            const fs = document.getElementById('fsViewer');
            const content = document.getElementById('fsContent');
            document.getElementById('fsPrev').style.display = 'none';
            document.getElementById('fsNext').style.display = 'none';
            document.getElementById('fsCaption').style.display = 'none';
            document.getElementById('fsBackdrop').style.backgroundImage = 'none';
            
            content.innerHTML = `
                <div style="width:100%; height:100%; padding: 40px; display:flex; align-items:center; justify-content:center; background:#000; position: relative;" id="vidContainer">
                    <div class="image-spinner active" id="vidSpinner" style="z-index: 10;"></div>
                    <video id="fsVideo" controls playsinline webkit-playsinline autoplay muted preload="metadata" style="width:100%; height:100%; max-height:85vh; border-radius:16px; box-shadow:0 30px 60px rgba(0,0,0,0.8); background: #06121E; opacity: 0; transition: opacity 0.5s;">
                        <source src="${url}" type="video/mp4">
                    </video>
                </div>`;
            fs.classList.add('active');

            const vid = document.getElementById('fsVideo');
            const spin = document.getElementById('vidSpinner');
            const container = document.getElementById('vidContainer');
            
            vid.addEventListener('canplay', () => {
                if(spin) spin.style.display = 'none';
                vid.style.opacity = '1';
            });
            vid.addEventListener('waiting', () => { if(spin) spin.style.display = 'block'; });
            vid.addEventListener('playing', () => { if(spin) spin.style.display = 'none'; });
            
            vid.addEventListener('error', () => {
                if(spin) spin.style.display = 'none';
                const altUrl = url.replace('.mp4', '.MOV');
                const safeAltUrl = altUrl.replace(/'/g, "\\'"); 
                
                container.innerHTML = `
                    <div style="text-align:center; color:white; font-family:var(--font-body);">
                        <svg viewBox="0 0 24 24" style="width:50px;height:50px;fill:#ff3b30;margin-bottom:15px;"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
                        <h2 style="margin-bottom:10px;">Video Format Issue</h2>
                        <p style="color:#8898AA; margin-bottom:30px; max-width: 400px; margin-left: auto; margin-right: auto;">The iPad could not process this video file format, or the file is missing from the server.</p>
                        <button onclick="document.getElementById('fsVideo').src='${safeAltUrl}'; this.innerText='Trying .MOV...'" style="padding:15px 30px; background:var(--gold); border-radius:15px; border:none; color:#06121E; font-weight:bold; cursor:pointer; margin-bottom:15px; width: 100%;">Try Alternate Format</button>
                        <br>
                        <button onclick="closeFs()" style="padding:15px 30px; background:rgba(255,255,255,0.1); border-radius:15px; border:none; color:white; font-weight:bold; cursor:pointer; width: 100%;">Close Player</button>
                    </div>`;
            });
            
            if (fsVideoTimeoutId) clearTimeout(fsVideoTimeoutId);
        
            fsVideoTimeoutId = setTimeout(() => { 
                if(spin) spin.style.display = 'none'; 
            }, 8000);
        }
        
        function closeFs() {
            const fs = document.getElementById('fsViewer');
            fs.classList.remove('active');
            if (lastFocusedEl && lastFocusedEl.focus) lastFocusedEl.focus();

            if (fsVideoTimeoutId) {
                clearTimeout(fsVideoTimeoutId);
                fsVideoTimeoutId = null;
            }

            const video = fs.querySelector('video');
            if (video) video.pause();

            setTimeout(() => {
                document.getElementById('fsContent').innerHTML = '';
                if (currentPdfBlobUrl) { URL.revokeObjectURL(currentPdfBlobUrl); currentPdfBlobUrl = null; }
            }, 300);
        }

        function showToast(msg) {
            const toast = document.getElementById('modeToast');
            toast.innerText = msg;
            toast.style.opacity = '1';
            setTimeout(() => toast.style.opacity = '0', 2500);
        }
