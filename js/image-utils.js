        // --- DEEP DEVICE DETECTION ENGINE ---
        document.addEventListener("DOMContentLoaded", () => {
            const ua = navigator.userAgent || navigator.vendor || window.opera;
            const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
            const isAndroid = /Android/.test(ua);
            const isMobile = /Mobi|Android/i.test(ua) || (isIOS && window.innerWidth < 800);
            const isTablet = (isIOS && window.innerWidth >= 800) || (isAndroid && !/Mobile/.test(ua)) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

            const docEl = document.documentElement;
            if(isIOS) docEl.classList.add('device-ios');
            if(isAndroid) docEl.classList.add('device-android');
            if(isTablet) docEl.classList.add('device-tablet');
            else if(isMobile) docEl.classList.add('device-mobile');
            else docEl.classList.add('device-desktop');
        });

        // --- ULTRA-FAST BULLETPROOF IMAGE RECOVERY (WITH GLOBAL CACHE) ---
        const failedImageCache = new Set(); 

        function handleImgError(img) {
            if (img.classList.contains('fs-image')) return;
            
            // Short-circuit immediately using a memory-level flag
            if (img._isFailed === true) return; 
            if (img.dataset.failed === 'true') return;
            
            const origSrc = img.dataset.origSrc || img.src;
            if (!img.dataset.origSrc) img.dataset.origSrc = origSrc;

            if (failedImageCache.has(origSrc)) {
                triggerFallback(img);
                return;
            }

            let retries = parseInt(img.dataset.retries || '0', 10);

            // js/data.js paths are verified against disk, so this is just a defensive
            // net for extension typos in future edits, not a routing layer.
            const fallbacks = [
                origSrc.replace(/\.jpg$/i, '.png'),
                origSrc.replace(/\.png$/i, '.jpg'),
                origSrc.replace(/\.jpeg$/i, '.jpg'),
                decodeURIComponent(origSrc)
            ];

            if (retries < fallbacks.length) {
                img.dataset.retries = (retries + 1).toString();
                img.src = fallbacks[retries];
            } else {
                failedImageCache.add(origSrc); 
                triggerFallback(img);
            }
        }

        function triggerFallback(img) {
            img.dataset.failed = 'true';
            img._isFailed = true; 
            
            const spinner = img.parentElement?.querySelector('.image-spinner');
            if(spinner) spinner.classList.remove('active');
            img.style.display = 'none';
            
            if (img.id === 'dImg') {
                img.parentElement.classList.add('hero-fallback');
            } else {
                const mediaContainer = img.closest('.card-media');
                if (mediaContainer) {
                    mediaContainer.classList.add('card-fallback');
                } else {
                    // 🚨 GHOST BOX FIX: Completely hide missing gallery items
                    const galleryItem = img.closest('.gallery-item');
                    if (galleryItem) {
                        galleryItem.style.display = 'none';
                    }
                }
            }
        }
        
        function handleImgLoad(img) {
            const spinner = img.parentElement?.querySelector('.image-spinner');
            if(spinner) spinner.classList.remove('active');
            
            img.style.display = 'block';
            img.dataset.failed = 'false';
            
            if (img.id === 'dImg') {
                img.parentElement?.classList.remove('hero-fallback');
            } else if (img.closest('.card-media')) {
                const mediaContainer = img.closest('.card-media');
                mediaContainer.classList.remove('card-fallback');
                const blurBg = mediaContainer.querySelector('.card-img-blur');
                if(blurBg) blurBg.style.backgroundImage = `url('${img.src}')`;
            } else if (img.closest('.gallery-item')) {
                const mediaContainer = img.closest('.gallery-item');
                mediaContainer.classList.remove('card-fallback');
                mediaContainer.style.display = 'flex'; // Ensure visible
            }
        }
